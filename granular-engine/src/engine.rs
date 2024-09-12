use std::{cell::RefCell, rc::Rc};

use crate::{
    buffer::StereoBuffer,
    env::Env,
    grain_pool::{self, GrainPool},
    pool::Pool,
    stream::Stream,
    timing::{self, Clock},
};

pub struct Engine {
    sample_rate: usize,
    clock: Rc<RefCell<Clock>>,
    grains: GrainPool,
    sample_buf: Option<StereoBuffer>,
    output_buf: StereoBuffer,
    params: EngineParams,
    streams: Pool<Stream>,
}

impl Engine {
    pub fn new(
        sample_rate: usize,
        output_buf_len: usize,
        output_buf_capacity: usize,
        max_streams: usize,
    ) -> Self {
        let params: EngineParams = Default::default();
        let clock = Rc::new(RefCell::new(Clock::new(
            sample_rate,
            timing::bpm_to_freq(params.bpm),
        )));
        Self {
            sample_rate,
            clock: Rc::clone(&clock),
            grains: GrainPool::new(1024),
            sample_buf: None,
            output_buf: StereoBuffer::new_with_capacity(
                sample_rate,
                output_buf_len,
                output_buf_capacity,
            ),
            params,
            streams: Pool::new(max_streams),
        }
    }

    pub fn alloc_sample_buf(&mut self, buf_len: usize) {
        self.sample_buf
            .replace(StereoBuffer::new(self.sample_rate, buf_len));
    }

    pub fn reset_after_update_sample(&mut self) {
        self.grains.reset();
    }

    pub fn sample_buf(&self, channel: usize) -> Option<&[f32]> {
        self.sample_buf.as_ref().map(|buf| buf.channel(channel))
    }

    pub fn output_buf(&self, channel: usize) -> &[f32] {
        &self.output_buf.channel(channel)
    }

    pub fn alloc_output_buf(&mut self, new_capacity: usize, new_len: usize) {
        self.output_buf.resize(new_capacity, new_len);
    }

    pub fn set_bpm(&mut self, bpm: u32) {
        if bpm == self.params.bpm {
            return;
        }
        self.params.bpm = bpm;
        self.clock.borrow_mut().set_freq(timing::bpm_to_freq(bpm));
    }

    pub fn add_stream(
        &mut self,
        subdivision: u32,
        grain_start: f32,
        grain_size_ms: usize,
        gain: f32,
        tune: i32,
        pan: f32,
        env: Env,
    ) -> Option<usize> {
        let stream = Stream::new(
            Rc::clone(&self.clock),
            subdivision,
            grain_start,
            grain_size_ms,
            gain,
            tune,
            pan,
            env,
        );
        self.streams.add(stream)
    }

    pub fn set_stream_subdivision(&mut self, stream_id: usize, subdivision: u32) {
        if let Some(mut stream) = self.streams.get_entry(stream_id) {
            stream.set_subdivision(subdivision);
        }
    }

    pub fn set_stream_grain_start(&mut self, stream_id: usize, grain_start: f32) {
        if let Some(mut stream) = self.streams.get_entry(stream_id) {
            stream.set_grain_start(grain_start);
        }
    }

    pub fn set_stream_grain_size_ms(&mut self, stream_id: usize, grain_size_ms: usize) {
        if let Some(mut stream) = self.streams.get_entry(stream_id) {
            stream.set_grain_size_ms(grain_size_ms);
        }
    }

    pub fn set_stream_gain(&mut self, stream_id: usize, gain: f32) {
        if let Some(mut stream) = self.streams.get_entry(stream_id) {
            stream.set_gain(gain);
        }
    }

    pub fn set_stream_tune(&mut self, stream_id: usize, tune: i32) {
        if let Some(mut stream) = self.streams.get_entry(stream_id) {
            stream.set_tune(tune);
        }
    }

    pub fn set_stream_pan(&mut self, stream_id: usize, pan: f32) {
        if let Some(mut stream) = self.streams.get_entry(stream_id) {
            stream.set_pan(pan);
        }
    }

    pub fn set_stream_env(&mut self, stream_id: usize, env: Env) {
        if let Some(mut stream) = self.streams.get_entry(stream_id) {
            stream.set_env(env);
        }
    }

    pub fn delete_stream(&mut self, stream_id: usize) {
        if let Some(entry) = self.streams.get_entry(stream_id) {
            entry.free();
        }
    }

    pub fn process(&mut self) {
        if let Some(sample_buf) = &self.sample_buf {
            for i in 0..self.output_buf.len {
                for stream in self.streams.entries() {
                    // issue: StreamEntry -> StreamItem (Option<Stream>). So we
                    // have an optional value here.
                    //
                    // Can we revisit the Option-based implementation over in
                    // Pool itself? Such that we don't have to have this
                    // `PoolItem` type? Such that whenever we iterate over
                    // `entries` we get actual "live" ones?
                    if let Some(grain) = stream.try_create_grain(&sample_buf) {
                        self.grains.add(grain);
                    }
                }

                self.output_buf.write_frame(i, &[0., 0.]);
                for grain in self.grains.entries() {
                    let frame = grain.render_frame(sample_buf);
                    self.output_buf.append_frame(i, &frame);
                    grain_pool::tick(grain);
                }

                self.clock.borrow_mut().tick();
            }
        }
    }
}

pub struct EngineParams {
    pub bpm: u32,
}

impl Default for EngineParams {
    fn default() -> Self {
        Self { bpm: 60 }
    }
}
