//! Lumi zero-knowledge sync server — **STUB** (ADR 0001 §5).
//!
//! Stores only **opaque ciphertext blobs** (the client-encoded envelopes). It
//! never decrypts, parses, or inspects content — true zero-knowledge. This M0 stub
//! keeps blobs in memory; M2 replaces the store with object storage and adds the
//! real cursor semantics, idempotency, replay protection, length-padding policy
//! enforcement, and the sync-relay controllership measures (ADR 0001 §5.1).

use std::sync::{Arc, Mutex};

use axum::{
    body::Bytes,
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Router,
};

/// Append-only store of opaque blobs. The server cannot read their contents.
#[derive(Clone, Default)]
struct Store {
    blobs: Arc<Mutex<Vec<Vec<u8>>>>,
}

#[tokio::main]
async fn main() {
    let app = router(Store::default());
    let addr = "127.0.0.1:8787";
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind sync server");
    println!("lumi-sync-server (stub) listening on {addr}");
    axum::serve(listener, app).await.expect("serve");
}

fn router(state: Store) -> Router {
    Router::new()
        .route("/v1/health", get(health))
        .route("/v1/push", post(push))
        .route("/v1/pull", get(pull))
        .with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

/// Accept an opaque blob. The body is stored verbatim; never inspected.
async fn push(State(store): State<Store>, body: Bytes) -> StatusCode {
    store.blobs.lock().expect("lock").push(body.to_vec());
    StatusCode::ACCEPTED
}

/// Stub: report how many blobs are held. Real cursor-based pull lands in M2.
async fn pull(State(store): State<Store>) -> String {
    let n = store.blobs.lock().expect("lock").len();
    n.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn router_builds() {
        // Compile-time check that the router + handlers wire up.
        let _ = router(Store::default());
    }

    #[test]
    fn store_is_append_only_opaque() {
        let store = Store::default();
        store.blobs.lock().unwrap().push(vec![1, 2, 3]);
        assert_eq!(store.blobs.lock().unwrap().len(), 1);
    }
}
