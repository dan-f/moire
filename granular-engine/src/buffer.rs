pub struct Buffer {
    pub len: usize,
    pub chans: usize,
    pub data: Vec<f32>,
}

impl Buffer {
    /// Allocate a buffer of `chans`-many channels. `capacity` and `len` are in
    /// terms of number of sample frames, i.e. for a 128-`len`, 1024-`capacity`
    /// stereo buffer, we would allocate an actual buffer capable of storing
    /// 2048 f32s, to fill with 256 interleaved f32 samples.
    pub fn new(chans: usize, capacity: usize, len: usize) -> Self {
        assert!(capacity >= len);
        Self {
            len,
            chans,
            data: vec![0.; chans * capacity],
        }
    }

    pub fn capacity(&self) -> usize {
        self.data.len() / self.chans
    }

    pub fn resize(&mut self, new_capacity: usize, new_len: usize) {
        assert!(new_capacity >= new_len);
        if new_capacity > self.capacity() {
            self.data.resize(self.chans * new_capacity, 0.);
        }
        self.len = new_len;
    }
}
