#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;
mod database;
mod db;
mod metadata;
mod migrations;
mod migration_status;
mod prompts;
mod search;
mod versions;
mod watcher;
mod security;
mod logging;
mod categories;

use db::init_database;
use metadata::{metadata_get, metadata_update, metadata_get_all_tags, metadata_get_model_providers, metadata_add_model_provider, metadata_remove_model_provider, regenerate_markdown_file};
use migration_status::get_migration_status;
use prompts::{save_prompt, list_prompts};
use search::{search_prompts, get_recent_prompts};
use versions::{get_latest_version, save_new_version, list_versions, list_versions_full, get_version_by_uuid, rollback_to_version};
use categories::{get_category_tree, update_prompt_category, rename_category, delete_category, get_prompts_by_category, create_category};
use watcher::start_file_watcher;
use logging::init_app_logging;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    log::info!("Starting PromptMaster Lite...");

    tauri::Builder::default()
        .setup(|app| {
            // Initialize application logging
            init_app_logging(&app.handle()).map_err(|e| {
                log::error!("Application logging initialization failed: {}", e);
                format!("Application logging initialization failed: {}", e)
            })?;
            
            init_database(&app.handle()).map_err(|e| {
                log::error!("Database initialization failed: {}", e);
                format!("Database initialization failed: {}", e)
            })?;
            
            start_file_watcher(app.handle().clone()).map_err(|e| {
                log::error!("File watcher failed: {}", e);
                format!("File watcher failed: {}", e)
            })?;
            
            log::info!("Application initialized successfully");
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_prompt, 
            list_prompts, 
            get_latest_version, 
            save_new_version, 
            list_versions, 
            list_versions_full,
            get_version_by_uuid,
            rollback_to_version,
            metadata_get,
            metadata_update,
            metadata_get_all_tags,
            metadata_get_model_providers,
            metadata_add_model_provider,
            metadata_remove_model_provider,
            regenerate_markdown_file,
            get_migration_status,
            search_prompts,
            get_recent_prompts,
            get_category_tree,
            update_prompt_category,
            rename_category,
            delete_category,
            get_prompts_by_category,
            create_category
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
