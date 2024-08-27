use crate::buffer::{Buffer, StereoBuffer};

pub struct Engine {
    sample_rate: usize,
    sample_buf: Option<StereoBuffer>,
    output_buf: StereoBuffer,
}

impl Engine {
    pub fn new(sample_rate: usize, output_buf_len: usize, output_buf_capacity: usize) -> Self {
        Self {
            sample_rate,
            sample_buf: None,
            output_buf: Buffer::new_with_capacity(output_buf_len, output_buf_capacity),
        }
    }

    pub fn alloc_sample_buf(&mut self, buf_len: usize) {
        self.sample_buf.replace(Buffer::new(buf_len));
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

    pub fn process(&mut self) {
        if let Some(sample_buf) = &self.sample_buf {
            for (dst_sample, src_sample) in self.output_buf.iter_l_mut().zip(sample_buf.iter_l()) {
                *dst_sample = *src_sample;
            }
            for (dst_sample, src_sample) in self.output_buf.iter_r_mut().zip(sample_buf.iter_r()) {
                *dst_sample = *src_sample;
            }
        }
    }
}
