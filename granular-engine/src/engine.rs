use std::{cell::RefCell, rc::Rc};

use crate::{buffer::StereoBuffer, clock::Clock, grain_pool::GrainPool, stream::Stream};

pub struct Engine {
    sample_rate: usize,
    clock: Rc<RefCell<Clock>>,
    grains: GrainPool,
    sample_buf: Option<StereoBuffer>,
    output_buf: StereoBuffer,
    params: EngineParams,
    streams: Vec<Stream>,
}

impl Engine {
    pub fn new(sample_rate: usize, output_buf_len: usize, output_buf_capacity: usize) -> Self {
        let params: EngineParams = Default::default();
        let clock = Rc::new(RefCell::new(Clock::new(sample_rate, params.bpm)));
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
            streams: vec![
                Stream::new(Rc::clone(&clock), 2, 0., 250),
                Stream::new(Rc::clone(&clock), 3, 0., 250),
            ],
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
        self.params.bpm = bpm;
    }

    pub fn process(&mut self) {
        if let Some(sample_buf) = &self.sample_buf {
            for i in 0..self.output_buf.len {
                for stream in self.streams.iter() {
                    if let Some(grain) = stream.try_create_grain(&sample_buf) {
                        self.grains.add(grain);
                    }
                }

                self.output_buf.write_frame(i, &[0., 0.]);
                for mut grain in self.grains.entries_mut() {
                    let frame = grain.render_frame(sample_buf);
                    self.output_buf.append_frame(i, &frame);
                    grain.tick();
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
