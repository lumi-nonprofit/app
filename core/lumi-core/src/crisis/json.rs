//! Minimal, dependency-free JSON reader for ČAPLD ingestion.
//!
//! Kept zero-dependency on purpose: the security-critical core stays lean, and the
//! crate builds with no C toolchain (no build scripts / proc-macros). Supports the
//! full JSON grammar (objects, arrays, strings incl. all escapes + `\u` surrogate
//! pairs, numbers, bool, null). Object key order is preserved; lookups are linear
//! (the documents are tiny).

#[derive(Debug, Clone, PartialEq)]
pub enum Json {
    Null,
    Bool(bool),
    Num(f64),
    Str(String),
    Arr(Vec<Json>),
    Obj(Vec<(String, Json)>),
}

impl Json {
    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Obj(o) => o.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Json::Str(s) => Some(s),
            _ => None,
        }
    }
    pub fn as_array(&self) -> Option<&Vec<Json>> {
        match self {
            Json::Arr(a) => Some(a),
            _ => None,
        }
    }
    pub fn is_object(&self) -> bool {
        matches!(self, Json::Obj(_))
    }
    pub fn is_null(&self) -> bool {
        matches!(self, Json::Null)
    }
}

/// Parse a JSON document. Returns `Err(())` on any malformation (callers degrade).
pub fn parse(s: &str) -> Result<Json, ()> {
    let mut p = Parser {
        b: s.as_bytes(),
        i: 0,
    };
    p.ws();
    let v = p.value()?;
    p.ws();
    if p.i != p.b.len() {
        return Err(()); // trailing garbage
    }
    Ok(v)
}

struct Parser<'a> {
    b: &'a [u8],
    i: usize,
}

impl Parser<'_> {
    fn ws(&mut self) {
        while self.i < self.b.len() && matches!(self.b[self.i], b' ' | b'\t' | b'\n' | b'\r') {
            self.i += 1;
        }
    }

    fn value(&mut self) -> Result<Json, ()> {
        self.ws();
        match *self.b.get(self.i).ok_or(())? {
            b'{' => self.object(),
            b'[' => self.array(),
            b'"' => Ok(Json::Str(self.string()?)),
            b't' => {
                self.lit("true")?;
                Ok(Json::Bool(true))
            }
            b'f' => {
                self.lit("false")?;
                Ok(Json::Bool(false))
            }
            b'n' => {
                self.lit("null")?;
                Ok(Json::Null)
            }
            b'-' | b'0'..=b'9' => self.number(),
            _ => Err(()),
        }
    }

    fn lit(&mut self, s: &str) -> Result<(), ()> {
        let end = self.i + s.len();
        if self.b.len() >= end && &self.b[self.i..end] == s.as_bytes() {
            self.i = end;
            Ok(())
        } else {
            Err(())
        }
    }

    fn array(&mut self) -> Result<Json, ()> {
        self.i += 1; // '['
        let mut out = Vec::new();
        self.ws();
        if self.b.get(self.i) == Some(&b']') {
            self.i += 1;
            return Ok(Json::Arr(out));
        }
        loop {
            out.push(self.value()?);
            self.ws();
            match self.b.get(self.i) {
                Some(&b',') => self.i += 1,
                Some(&b']') => {
                    self.i += 1;
                    break;
                }
                _ => return Err(()),
            }
        }
        Ok(Json::Arr(out))
    }

    fn object(&mut self) -> Result<Json, ()> {
        self.i += 1; // '{'
        let mut out: Vec<(String, Json)> = Vec::new();
        self.ws();
        if self.b.get(self.i) == Some(&b'}') {
            self.i += 1;
            return Ok(Json::Obj(out));
        }
        loop {
            self.ws();
            let key = self.string()?;
            self.ws();
            if self.b.get(self.i) != Some(&b':') {
                return Err(());
            }
            self.i += 1;
            let val = self.value()?;
            out.push((key, val));
            self.ws();
            match self.b.get(self.i) {
                Some(&b',') => self.i += 1,
                Some(&b'}') => {
                    self.i += 1;
                    break;
                }
                _ => return Err(()),
            }
        }
        Ok(Json::Obj(out))
    }

    fn number(&mut self) -> Result<Json, ()> {
        let start = self.i;
        if self.b.get(self.i) == Some(&b'-') {
            self.i += 1;
        }
        while self.i < self.b.len()
            && matches!(self.b[self.i], b'0'..=b'9' | b'.' | b'e' | b'E' | b'+' | b'-')
        {
            self.i += 1;
        }
        let s = std::str::from_utf8(&self.b[start..self.i]).map_err(|_| ())?;
        s.parse::<f64>().map(Json::Num).map_err(|_| ())
    }

    fn string(&mut self) -> Result<String, ()> {
        if self.b.get(self.i) != Some(&b'"') {
            return Err(());
        }
        self.i += 1;
        let mut out: Vec<u8> = Vec::new();
        loop {
            let c = *self.b.get(self.i).ok_or(())?;
            self.i += 1;
            match c {
                b'"' => break,
                b'\\' => {
                    let e = *self.b.get(self.i).ok_or(())?;
                    self.i += 1;
                    match e {
                        b'"' => out.push(b'"'),
                        b'\\' => out.push(b'\\'),
                        b'/' => out.push(b'/'),
                        b'n' => out.push(b'\n'),
                        b't' => out.push(b'\t'),
                        b'r' => out.push(b'\r'),
                        b'b' => out.push(8),
                        b'f' => out.push(12),
                        b'u' => {
                            let cp = self.hex4()?;
                            let scalar = if (0xD800..=0xDBFF).contains(&cp) {
                                // high surrogate → expect a low surrogate \uXXXX
                                if self.b.get(self.i) == Some(&b'\\')
                                    && self.b.get(self.i + 1) == Some(&b'u')
                                {
                                    self.i += 2;
                                    let lo = self.hex4()?;
                                    if (0xDC00..=0xDFFF).contains(&lo) {
                                        0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00)
                                    } else {
                                        return Err(());
                                    }
                                } else {
                                    return Err(());
                                }
                            } else if (0xDC00..=0xDFFF).contains(&cp) {
                                return Err(()); // lone low surrogate
                            } else {
                                cp
                            };
                            let ch = char::from_u32(scalar).ok_or(())?;
                            let mut buf = [0u8; 4];
                            out.extend_from_slice(ch.encode_utf8(&mut buf).as_bytes());
                        }
                        _ => return Err(()),
                    }
                }
                _ => out.push(c), // raw byte; multibyte UTF-8 copied verbatim
            }
        }
        String::from_utf8(out).map_err(|_| ())
    }

    fn hex4(&mut self) -> Result<u32, ()> {
        let mut v = 0u32;
        for _ in 0..4 {
            let c = *self.b.get(self.i).ok_or(())?;
            self.i += 1;
            let d = (c as char).to_digit(16).ok_or(())?;
            v = v * 16 + d;
        }
        Ok(v)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_nested_and_types() {
        let v = parse(r#"{"a":[1,true,null,"x"],"b":{"c":"d"}}"#).unwrap();
        assert_eq!(v.get("a").and_then(Json::as_array).unwrap().len(), 4);
        assert_eq!(
            v.get("b").and_then(|b| b.get("c")).and_then(Json::as_str),
            Some("d")
        );
        assert!(v.get("a").unwrap().as_array().unwrap()[2].is_null());
    }

    #[test]
    fn handles_escapes_and_unicode() {
        let v = parse(r#""a\"b\\c\né😀""#).unwrap();
        assert_eq!(v.as_str(), Some("a\"b\\c\n\u{e9}\u{1F600}"));
    }

    #[test]
    fn raw_utf8_passthrough() {
        let v = parse(r#"{"x":"Linka důvěry — Ústí"}"#).unwrap();
        assert_eq!(v.get("x").and_then(Json::as_str), Some("Linka důvěry — Ústí"));
    }

    #[test]
    fn rejects_malformed() {
        assert!(parse("{").is_err());
        assert!(parse(r#"{"a":}"#).is_err());
        assert!(parse(r#"[1,2,]"#).is_err());
        assert!(parse("nul").is_err());
        assert!(parse(r#""abc"junk"#).is_err());
    }
}
