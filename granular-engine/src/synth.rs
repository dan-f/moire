use crate::buffer::Buffer;

pub struct Synth {
    sample_rate: usize,
    sample_buf: Option<Buffer>,
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

    pub fn alloc_sample_buf(&mut self, buf_len: usize) {
        self.sample_buf.replace(Buffer::new(2, buf_len, buf_len));
    }

    pub fn sample_buf(&self) -> Option<&[f32]> {
        self.sample_buf.as_ref().map(|buf| buf.data.as_slice())
    }

    pub fn output_buf(&self) -> &[f32] {
        &self.output_buf.data
    }

    pub fn alloc_output_buf(&mut self, new_capacity: usize, new_len: usize) {
        self.output_buf.resize(new_capacity, new_len);
    }

    pub fn process(&mut self) {
        if let Some(sample_buf) = &self.sample_buf {
            for (dst_sample, src_sample) in self.output_buf.frames_mut().zip(sample_buf.frames()) {
                dst_sample[0] = src_sample[0];
                dst_sample[1] = src_sample[1];
            }
        }
    }
}
