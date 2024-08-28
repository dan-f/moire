use engine::Engine;

mod buffer;
mod clock;
mod engine;

#[no_mangle]
pub extern "C" fn new_engine(
    sample_rate: usize,
    output_buf_capacity: usize,
    output_buf_len: usize,
) -> *const Engine {
    let boxed: Box<Engine> = Engine::new(sample_rate, output_buf_capacity, output_buf_len).into();
    Box::into_raw(boxed)
}

#[no_mangle]
pub unsafe extern "C" fn alloc_sample_buf(engine: *mut Engine, buf_len: usize) {
    engine.as_mut().unwrap().alloc_sample_buf(buf_len)
}

#[no_mangle]
pub unsafe extern "C" fn alloc_output_buf(
    engine: *mut Engine,
    new_capacity: usize,
    new_len: usize,
) {
    engine
        .as_mut()
        .unwrap()
        .alloc_output_buf(new_capacity, new_len);
}

#[no_mangle]
pub unsafe extern "C" fn sample_buf_l(engine: *const Engine) -> *const f32 {
    engine
        .as_ref()
        .unwrap()
        .sample_buf(0)
        .expect("Sample buffer has not been initialized")
        .as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn sample_buf_r(engine: *const Engine) -> *const f32 {
    engine
        .as_ref()
        .unwrap()
        .sample_buf(1)
        .expect("Sample buffer has not been initialized")
        .as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn output_buf_l(engine: *const Engine) -> *const f32 {
    engine.as_ref().unwrap().output_buf(0).as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn output_buf_r(engine: *const Engine) -> *const f32 {
    engine.as_ref().unwrap().output_buf(0).as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn set_bpm(engine: *mut Engine, bpm: u32) {
    engine.as_mut().unwrap().set_bpm(bpm);
}

#[no_mangle]
pub unsafe extern "C" fn process(engine: *mut Engine) {
    engine.as_mut().unwrap().process();
}
