//! Structural tests that enforce the crate dependency layering.
//!
//! These tests parse Cargo.toml files and verify that each crate only
//! depends on crates at a lower layer number, per docs/architecture.md.

use std::collections::HashMap;
use std::fs;
use std::path::Path;

fn allowed_deps() -> HashMap<&'static str, Vec<&'static str>> {
    let mut m = HashMap::new();
    m.insert("allowance-types", vec![]);
    m.insert("allowance-config", vec!["allowance-types"]);
    m.insert("allowance-domain", vec!["allowance-types"]);
    m.insert(
        "allowance-repo",
        vec!["allowance-types", "allowance-domain"],
    );
    m.insert(
        "allowance-service",
        vec![
            "allowance-types",
            "allowance-config",
            "allowance-domain",
            "allowance-repo",
        ],
    );
    m.insert(
        "allowance-api",
        vec!["allowance-types", "allowance-config", "allowance-service"],
    );
    m
}

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

fn parse_internal_deps(cargo_toml_path: &Path) -> Vec<String> {
    let content = fs::read_to_string(cargo_toml_path)
        .unwrap_or_else(|e| panic!("Failed to read {}: {}", cargo_toml_path.display(), e));

    let internals = internal_crates();
    internals
        .iter()
        .filter(|crate_name| {
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
