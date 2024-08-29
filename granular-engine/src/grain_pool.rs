use std::{
    cell::RefCell,
    iter,
    ops::{Deref, DerefMut},
};

use crate::grain::Grain;

pub struct GrainPool {
    objects: Vec<Option<Grain>>,
    free_list: RefCell<Vec<usize>>,
}

impl GrainPool {
    pub fn new(capacity: usize) -> Self {
        Self {
            objects: iter::repeat_with(|| None).take(capacity).collect(),
            free_list: RefCell::new((0..capacity).collect()),
        }
    }

    pub fn add(&mut self, grain: Grain) -> bool {
        if let Some(i) = self.free_list.borrow_mut().pop() {
            self.objects[i].replace(grain);
            true
        } else {
            false
        }
    }

    // pub fn entry(&self, grain: Option<&mut Grain>, idx: usize) -> Entry {
    //     Entry {
    //         pool: self,
    //         grain,
    //         idx,
    //     }
    // }

    pub fn free(&mut self, i: usize) {
        self.objects[i].take();
        self.free_list.borrow_mut().push(i);
    }

    fn get(&self, i: usize) -> &Option<Grain> {
        &self.objects[i]
    }

    // pub fn iter(&self) -> impl Iterator<Item = (usize, &Grain)> {
    //     self.objects
    //         .iter()
    //         .enumerate()
    //         .filter_map(|(i, entry)| entry.as_ref().map(|grain| (i, grain)))
    // }

    pub fn iter_mut(&mut self) -> impl Iterator<Item = (usize, &mut Grain)> {
        self.objects
            .iter_mut()
            .enumerate()
            .filter_map(|(i, entry)| entry.as_mut().map(|grain| (i, grain)))
    }

    pub fn entries_mut(&mut self) -> impl Iterator<Item = GrainEntry> {
        self.objects
            .iter_mut()
            .enumerate()
            .filter_map(|(idx, slot)| {
                slot.as_mut().map(|grain| GrainEntry {
                    free_list: &self.free_list,
                    grain: grain,
                    idx,
                })
            })
    }
}

pub struct GrainEntry<'a> {
    free_list: &'a RefCell<Vec<usize>>,
    grain: &'a mut Grain,
    idx: usize,
}

impl<'a> GrainEntry<'a> {
    pub fn free(&self) {
        self.free_list.borrow_mut().push(self.idx);
    }

    pub fn tick(&mut self) {
        if !self.grain.tick() {
            self.free();
        }
    }
}

impl<'a> Deref for GrainEntry<'a> {
    type Target = Grain;

    fn deref(&self) -> &Self::Target {
        self.grain
    }
}

impl<'a> DerefMut for GrainEntry<'a> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.grain
    }
}
