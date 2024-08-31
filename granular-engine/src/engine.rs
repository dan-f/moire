use crate::{buffer::StereoBuffer, clock::Clock, grain::Grain, grain_pool::GrainPool};

pub struct Engine {
    sample_rate: usize,
    clock: Clock,
    grains: GrainPool,
    sample_buf: Option<StereoBuffer>,
    output_buf: StereoBuffer,
    params: EngineParams,
}

impl Engine {
    pub fn new(sample_rate: usize, output_buf_len: usize, output_buf_capacity: usize) -> Self {
        let params: EngineParams = Default::default();
        Self {
            sample_rate,
            clock: Clock::new(sample_rate, params.bpm),
            grains: GrainPool::new(1024),
            sample_buf: None,
            output_buf: StereoBuffer::new_with_capacity(output_buf_len, output_buf_capacity),
            params,
        }
    }

    pub fn alloc_sample_buf(&mut self, buf_len: usize) {
        self.sample_buf.replace(StereoBuffer::new(buf_len));
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
                if self.clock.is_beat() {
                    self.grains.add(Grain::new(0, self.sample_rate / 4));
                }

                self.output_buf.data[0][i] = 0.;
                self.output_buf.data[1][i] = 0.;
                for mut grain in self.grains.handles_mut() {
                    let frame = grain.render_frame(sample_buf);
                    self.output_buf.data[0][i] += frame[0];
                    self.output_buf.data[1][i] += frame[1];
                    grain.tick();
                }

                self.clock.tick();
            }
        }
    }
}

pub struct EngineParams {
    pub bpm: u32,
}

impl Default for EngineParams {
    fn default() -> Self {
        Self { bpm: 120 }
    }
}
