use engine::Engine;
use env::Env;

use crate::{
    buffer::Buffer,
    engine::{EngineConfig, EngineParams},
};

mod adsr;
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
mod voice_manager;

const NUM_STREAMS: usize = 6;

#[no_mangle]
pub extern "C" fn new_engine(
    sample_rate: usize,
    output_buf_len: usize,
    output_buf_capacity: usize,
) -> *const Engine<NUM_STREAMS> {
    Box::into_raw(
        Engine::new(
            EngineConfig {
                sample_rate,
                output_buf_len,
                output_buf_capacity,
            },
            EngineParams::default(),
        )
        .into(),
    )
}

#[no_mangle]
pub unsafe extern "C" fn new_buffer(channels: usize, len: usize, capacity: usize) -> *const Buffer {
    Box::into_raw(Buffer::new_with_capacity(channels, len, capacity).into())
}

#[no_mangle]
pub unsafe extern "C" fn resize_buffer(buffer: *mut Buffer, new_capacity: usize, new_len: usize) {
    buffer.as_mut().unwrap().resize(new_capacity, new_len);
}

#[no_mangle]
pub unsafe extern "C" fn buffer_channel(buffer: *const Buffer, channel: usize) -> *const f32 {
    buffer.as_ref().unwrap()[channel].as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn reset_after_update_sample(engine: *mut Engine<NUM_STREAMS>) {
    engine.as_mut().unwrap().reset_after_update_sample();
}

#[no_mangle]
pub unsafe extern "C" fn set_bpm(engine: *mut Engine<NUM_STREAMS>, bpm: u32) {
    engine.as_mut().unwrap().set_bpm(bpm);
}

#[no_mangle]
pub unsafe extern "C" fn apply_note_event(engine: *mut Engine<NUM_STREAMS>, note_event: i32) {
    engine.as_mut().unwrap().apply_note_event(note_event);
}

// TODO(poly) change to set_voice_<param>(engine, voice, stream, param_val)
#[no_mangle]
pub unsafe extern "C" fn set_adsr(
    engine: *mut Engine<NUM_STREAMS>,
    attack_ms: u32,
    decay_ms: u32,
    sustain: f32,
    release_ms: u32,
) {
    engine
        .as_mut()
        .unwrap()
        .set_adsr(attack_ms, decay_ms, sustain, release_ms);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_enabled(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    enabled: f32,
) {
    engine
        .as_mut()
        .unwrap()
        .set_stream_enabled(stream_id, enabled >= 0.5);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_subdivision(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    subdivision: u32,
) {
    engine
        .as_mut()
        .unwrap()
        .set_stream_subdivision(stream_id, subdivision);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_grain_start(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    grain_start: f32,
) {
    engine
        .as_mut()
        .unwrap()
        .set_stream_grain_start(stream_id, grain_start);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_grain_size_ms(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    grain_size_ms: usize,
) {
    engine
        .as_mut()
        .unwrap()
        .set_stream_grain_size_ms(stream_id, grain_size_ms);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_gain(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    gain: f32,
) {
    engine.as_mut().unwrap().set_stream_gain(stream_id, gain);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_tune(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    tune: i32,
) {
    engine.as_mut().unwrap().set_stream_tune(stream_id, tune);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_pan(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    pan: f32,
) {
    engine.as_mut().unwrap().set_stream_pan(stream_id, pan);
}

#[no_mangle]
pub unsafe extern "C" fn set_stream_env(
    engine: *mut Engine<NUM_STREAMS>,
    stream_id: usize,
    env: u32,
) {
    engine
        .as_mut()
        .unwrap()
        .set_stream_env(stream_id, Env::try_from(env).unwrap());
}

#[no_mangle]
pub unsafe extern "C" fn process(
    engine: *mut Engine<NUM_STREAMS>,
    sample_buf: *const Buffer,
    output_buf: *mut Buffer,
    playheads_buf: *mut Buffer,
) {
    engine.as_mut().unwrap().process(
        sample_buf.as_ref().unwrap(),
        output_buf.as_mut().unwrap(),
        playheads_buf.as_mut().unwrap(),
    );
}
