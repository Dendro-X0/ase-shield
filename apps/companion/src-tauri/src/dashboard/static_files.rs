use axum::{
    extract::Request,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use include_dir::{include_dir, Dir};

static DASHBOARD: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../dashboard-dist");

pub async fn serve_dashboard(request: Request) -> Response {
    let path = request.uri().path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    if path.starts_with("api/") || path == "ipc" || path == "health" {
        return StatusCode::NOT_FOUND.into_response();
    }

    if let Some(file) = DASHBOARD.get_file(path) {
        return file_response(path, file.contents());
    }

    if let Some(file) = DASHBOARD.get_file("index.html") {
        return file_response("index.html", file.contents());
    }

    (
        StatusCode::NOT_FOUND,
        "Dashboard not built. Run pnpm --filter @ase/dashboard build.",
    )
        .into_response()
}

fn file_response(path: &str, bytes: &[u8]) -> Response {
    let content_type = match path.rsplit('.').next() {
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "application/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("ico") => "image/x-icon",
        Some("json") => "application/json",
        Some("woff2") => "font/woff2",
        _ => "application/octet-stream",
    };

    (
        [(header::CONTENT_TYPE, content_type)],
        bytes.to_vec(),
    )
        .into_response()
}
