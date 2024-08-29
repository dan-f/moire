use core::slice;
use std::{array, iter};

pub struct Buffer<const C: usize> {
    pub len: usize,
    pub data: [Vec<f32>; C],
}

impl<const C: usize> Buffer<C> {
    pub fn new(len: usize) -> Self {
        Self::new_with_capacity(len, len)
    }

    pub fn new_with_capacity(len: usize, capacity: usize) -> Self {
        assert!(C > 0);
        assert!(capacity >= len);
        Self {
            len,
            data: array::from_fn(|_| vec![0.; capacity]),
        }
    }

    pub fn channel(&self, chan_idx: usize) -> &[f32] {
        &self.data[chan_idx]
    }

    pub fn frame(&self, i: usize) -> [f32; C] {
        let mut frame = [0.; C];
        for channel in 0..C {
            frame[channel] = self.data[channel][i];
        }
        frame
    }

    // TODO is this remotely useful?
    // pub fn frames(&self) -> Frames<'_, C> {
    //     // TODO prevent allocations
    //     Frames {
    //         iters: self
    //             .data
    //             .iter()
    //             .map(|v| v.iter())
    //             .collect::<Vec<_>>()
    //             .try_into()
    //             .unwrap(),
    //     }
    // }

    // TODO is this remotely useful?
    // pub fn frames_mut(&mut self) -> FramesMut<'_, C> {
    //     // TODO prevent allocations
    //     FramesMut {
    //         iters: self
    //             .data
    //             .iter_mut()
    //             .map(|v| v.iter_mut())
    //             .collect::<Vec<_>>()
    //             .try_into()
    //             .unwrap(),
    //     }
    // }

    pub fn resize(&mut self, new_capacity: usize, new_len: usize) {
        assert!(new_capacity >= new_len);
        if new_capacity > self.capacity() {
            for chan in self.data.iter_mut() {
                chan.resize(new_capacity, 0.);
            }
        }
        self.len = new_len;
    }

    pub fn capacity(&self) -> usize {
        self.data[0].len()
    }
}

pub type StereoBuffer = Buffer<2>;

struct Frames<'a, const C: usize> {
    iters: [slice::Iter<'a, f32>; C],
}

impl<'a, const C: usize> Iterator for Frames<'a, C> {
    type Item = [f32; C];

    fn next(&mut self) -> Option<Self::Item> {
        let mut result = [0.; C];
        for (i, it) in self.iters.iter_mut().enumerate() {
            if let Some(&sample) = it.next() {
                result[i] = sample;
            } else {
                return None;
            }
        }
        Some(result)
    }
}

struct FramesMut<'a, const C: usize> {
    iters: [slice::IterMut<'a, f32>; C],
}

impl<'a, const C: usize> Iterator for FramesMut<'a, C> {
    type Item = [&'a mut f32; C];

    fn next(&mut self) -> Option<Self::Item> {
        let mut result: [Option<&mut f32>; C] = array::from_fn(|_| None);
        for (i, it) in self.iters.iter_mut().enumerate() {
            let sample = it.next();
            if sample.is_none() {
                return None;
            }
            result[i] = sample;
        }
        Some(result.map(|x| x.unwrap()))
    }
}
