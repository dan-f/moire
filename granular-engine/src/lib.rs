use engine::Engine;
use env::Env;

use crate::engine::EngineConfig;

mod buffer;
mod dsp;
mod engine;
mod env;
mod grain;
mod grain_pool;
mod pool;
mod rand;
mod stream;
mod timing;
mod tuning;
mod voice;

#[no_mangle]
pub extern "C" fn new_engine(
    sample_rate: usize,
    output_buf_len: usize,
    output_buf_capacity: usize,
) -> *const Engine {
    let boxed: Box<Engine> = Engine::new(EngineConfig {
        sample_rate,
        output_buf_len,
        output_buf_capacity,
    })
    .into();
    Box::into_raw(boxed)
}

#[no_mangle]
pub unsafe extern "C" fn alloc_sample_buf(engine: *mut Engine, buf_len: usize) {
    engine.as_mut().unwrap().alloc_sample_buf(buf_len);
}

#[no_mangle]
pub unsafe extern "C" fn reset_after_update_sample(engine: *mut Engine) {
    engine.as_mut().unwrap().reset_after_update_sample();
}

#[no_mangle]
pub unsafe extern "C" fn alloc_output_bufs(
    engine: *mut Engine,
    new_capacity: usize,
    new_len: usize,
) {
    engine
        .as_mut()
        .unwrap()
        .alloc_output_bufs(new_capacity, new_len);
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
    engine.as_ref().unwrap().output_buf(1).as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn playhead_buf(engine: *const Engine, idx: usize) -> *const f32 {
    engine.as_ref().unwrap().playhead_buf(idx).as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn set_bpm(engine: *mut Engine, bpm: u32) {
    engine.as_mut().unwrap().set_bpm(bpm);
}

// TODO(poly) add voice param
#[no_mangle]
pub unsafe extern "C" fn set_gate(engine: *mut Engine, gate: f32) {
    engine.as_mut().unwrap().set_gate(gate >= 0.5);
}

// TODO(poly) add voice param
#[no_mangle]
pub unsafe extern "C" fn set_note(engine: *mut Engine, note: u32) {
    engine.as_mut().unwrap().set_note(note);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_enabled(engine: *mut Engine, stream_id: usize, enabled: f32) {
    engine
        .as_mut()
        .unwrap()
        .voice
        .set_enabled(stream_id, enabled >= 0.5);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_subdivision(
    engine: *mut Engine,
    stream_id: usize,
    subdivision: u32,
) {
    engine
        .as_mut()
        .unwrap()
        .voice
        .set_subdivision(stream_id, subdivision);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_grain_start(
    engine: *mut Engine,
    stream_id: usize,
    grain_start: f32,
) {
    engine
        .as_mut()
        .unwrap()
        .voice
        .set_grain_start(stream_id, grain_start);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_grain_size_ms(
    engine: *mut Engine,
    stream_id: usize,
    grain_size_ms: usize,
) {
    engine
        .as_mut()
        .unwrap()
        .voice
        .set_grain_size_ms(stream_id, grain_size_ms);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_gain(engine: *mut Engine, stream_id: usize, gain: f32) {
    engine.as_mut().unwrap().voice.set_gain(stream_id, gain);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_tune(engine: *mut Engine, stream_id: usize, tune: i32) {
    engine.as_mut().unwrap().voice.set_tune(stream_id, tune);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_pan(engine: *mut Engine, stream_id: usize, pan: f32) {
    engine.as_mut().unwrap().voice.set_pan(stream_id, pan);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_stream_env(engine: *mut Engine, stream_id: usize, env: u32) {
    engine
        .as_mut()
        .unwrap()
        .voice
        .set_env(stream_id, Env::try_from(env).unwrap());
}

#[no_mangle]
pub unsafe extern "C" fn process(engine: *mut Engine) {
    engine.as_mut().unwrap().process();
}
