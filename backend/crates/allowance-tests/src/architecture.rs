//! Structural tests that enforce the crate dependency layering.
//!
//! These tests parse Cargo.toml files and verify that each crate only
//! depends on crates at a lower layer number, per docs/architecture.md.

use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Returns the allowed internal dependencies for each crate.
fn allowed_deps() -> HashMap<&'static str, Vec<&'static str>> {
    let mut m = HashMap::new();
    // Layer 0: no internal deps
    m.insert("allowance-types", vec![]);
    // Layer 1: types only
    m.insert("allowance-config", vec!["allowance-types"]);
    // Layer 2: types only (domain must be DB-agnostic)
    m.insert("allowance-domain", vec!["allowance-types"]);
    // Layer 3: types + domain (no config, no service, no api)
    m.insert("allowance-repo", vec!["allowance-types", "allowance-domain"]);
    // Layer 4: types + config + domain + repo
    m.insert(
        "allowance-service",
        vec![
            "allowance-types",
            "allowance-config",
            "allowance-domain",
            "allowance-repo",
        ],
    );
    // Layer 5: types + config + service (no repo, no domain directly)
    m.insert(
        "allowance-api",
        vec!["allowance-types", "allowance-config", "allowance-service"],
    );
    m
}

/// All internal crate names.
fn internal_crates() -> Vec<&'static str> {
    vec![
        "allowance-types",
        "allowance-config",
        "allowance-domain",
        "allowance-repo",
        "allowance-service",
        "allowance-api",
    ]
}

/// Extracts internal crate dependencies from a Cargo.toml file.
fn parse_internal_deps(cargo_toml_path: &Path) -> Vec<String> {
    let content = fs::read_to_string(cargo_toml_path)
        .unwrap_or_else(|e| panic!("Failed to read {}: {}", cargo_toml_path.display(), e));

    let internals = internal_crates();
    internals
        .iter()
        .filter(|crate_name| {
            // Match lines like: allowance-types.workspace = true
            // or allowance-types = { path = ... }
            content
                .lines()
                .any(|line| line.trim().starts_with(*crate_name) && !line.trim().starts_with('#'))
        })
        .map(|s| s.to_string())
        .collect()
}

#[test]
fn dependency_layering_is_enforced() {
    let allowed = allowed_deps();
    // CARGO_MANIFEST_DIR points to this test crate; go up one level to the crates/ directory.
    let crates_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("crates dir");

    let mut violations = Vec::new();

    for (crate_name, allowed_deps) in &allowed {
        let cargo_toml = crates_dir.join(crate_name).join("Cargo.toml");
        if !cargo_toml.exists() {
            violations.push(format!("Missing Cargo.toml for {}", crate_name));
            continue;
        }

        let actual_deps = parse_internal_deps(&cargo_toml);
        for dep in &actual_deps {
            // Skip self-reference
            if dep == crate_name {
                continue;
            }
            if !allowed_deps.contains(&dep.as_str()) {
                violations.push(format!(
                    "{} depends on {} which is NOT allowed. Allowed: {:?}",
                    crate_name, dep, allowed_deps
                ));
            }
        }
    }

    assert!(
        violations.is_empty(),
        "Dependency layering violations found:\n{}",
        violations.join("\n")
    );
}
