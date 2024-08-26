use crate::buffer::Buffer;

pub struct Synth {
    sample_rate: usize,
    sample_buf: Option<Buffer>,
    /// Stereo interleaved output buffer
    output_buf: Buffer,
}

impl Synth {
    pub fn new(sample_rate: usize, output_buf_capacity: usize, output_buf_len: usize) -> Self {
        Self {
            sample_rate,
            sample_buf: None,
            output_buf: Buffer::new(2, output_buf_capacity, output_buf_len),
        }
    }

    pub fn alloc_sample_buffer(&mut self, buf_len: usize) -> &[f32] {
        self.sample_buf.replace(Buffer::new(2, buf_len, buf_len));
        &self.sample_buf.as_ref().unwrap().data
    }

    pub fn output_buffer(&self) -> &[f32] {
        &self.output_buf.data
    }

    pub fn resize_output_buf(&mut self, new_capacity: usize, new_len: usize) {
        self.output_buf.resize(new_capacity, new_len);
    }
}
