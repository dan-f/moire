use std::iter;

use crate::grain::Grain;

pub struct GrainPool<const S: usize> {
    objects: Vec<Option<Grain>>,
    free_list: Vec<usize>,
}

impl<const S: usize> GrainPool<S> {
    pub fn new() -> Self {
        Self {
            objects: iter::repeat_with(|| None).take(S).collect(),
            free_list: (0..S).collect(),
        }
    }

    pub fn add(&mut self, grain: Grain) -> bool {
        if let Some(i) = self.free_list.pop() {
            self.objects[i].replace(grain);
            true
        } else {
            false
        }
    }

    pub fn free(&mut self, i: usize) {
        self.objects[i].take();
    }

    pub fn iter(&self) -> impl Iterator<Item = (usize, &Grain)> {
        self.objects
            .iter()
            .enumerate()
            .filter_map(|(i, entry)| entry.as_ref().map(|grain| (i, grain)))
    }

    pub fn iter_mut(&mut self) -> impl Iterator<Item = (usize, &mut Grain)> {
        self.objects
            .iter_mut()
            .enumerate()
            .filter_map(|(i, entry)| entry.as_mut().map(|grain| (i, grain)))
    }
}
