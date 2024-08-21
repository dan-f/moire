use crate::buffer::Buffer;

pub struct Synth {
    // tempo: u16,
    // sample_buf: Buffer<2>,
    sample_rate: usize,
    output_buf: Buffer<2>,
}

impl Synth {
    pub fn new(sample_rate: usize, output_buf_capacity: usize, output_buf_len: usize) -> Self {
        Self {
            sample_rate,
            output_buf: Buffer::new(output_buf_capacity, output_buf_len),
        }
    }

    pub fn resize_output_buf(&mut self, new_capacity: usize, new_len: usize) {
        self.output_buf.resize(new_capacity, new_len);
    }

    pub fn output_channel(&self, channel: usize) -> &[f32] {
        self.output_buf.channel(channel)
    }
}
