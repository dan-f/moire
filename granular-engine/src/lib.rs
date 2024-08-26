use synth::Synth;

mod buffer;
mod synth;

#[no_mangle]
pub extern "C" fn new_synth(
    sample_rate: usize,
    output_buf_capacity: usize,
    output_buf_len: usize,
) -> *mut Synth {
    let boxed: Box<Synth> = Synth::new(sample_rate, output_buf_capacity, output_buf_len).into();
    Box::into_raw(boxed)
}

#[no_mangle]
pub unsafe extern "C" fn alloc_sample_buffer(synth: *mut Synth, buf_len: usize) -> *const f32 {
    synth
        .as_mut()
        .unwrap()
        .alloc_sample_buffer(buf_len)
        .as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn output_buffer(synth: *const Synth) -> *const f32 {
    synth.as_ref().unwrap().output_buffer().as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn resize_output_buf(synth: *mut Synth, new_capacity: usize, new_len: usize) {
    synth
        .as_mut()
        .unwrap()
        .resize_output_buf(new_capacity, new_len);
}

#[no_mangle]
pub extern "C" fn process(synth: *mut Synth) {
    println!("Processing for synth {:?}", synth);
}
