// allowing this dead code for now as 1. it's a useful reminder for how to
// access WASM imports and 2. it may be used in the future
#![allow(dead_code)]

mod math_js {
    #[link(wasm_import_module = "Math")]
    extern "C" {
        pub fn random() -> f32;
    }
}

pub fn random() -> f32 {
    unsafe { math_js::random() }
}
