/// TechRat desktop shell. All business logic lives in the backend API; the UI is the shared web app
/// (static export) running in bearer-token mode. The opener plugin lets "Learn more" links open in the
/// user's default browser instead of inside the app window.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running TechRat");
}
