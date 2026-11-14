//! UniFFI bindings generator entry point.
//!
//! UniFFI 0.28 does not publish a standalone `uniffi-bindgen` binary; projects
//! are expected to define this tiny binary themselves (see the UniFFI manual:
//! "Creating the bindgen binary"). All heavy lifting lives in the `uniffi`
//! crate behind the `cli` feature.
fn main() {
    uniffi::uniffi_bindgen_main()
}
