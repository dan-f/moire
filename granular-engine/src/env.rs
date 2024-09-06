#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Env {
    None,
    Tri,
    Trap,
    Expo,
    Rxpo,
}

impl Env {
    pub fn at(&self, t: f32) -> f32 {
        match self {
            Self::None => 1.,
            Self::Tri => Self::tri_at(t),
            Self::Trap => Self::trap_at(t),
            Self::Expo => Self::expo_at(t),
            Self::Rxpo => Self::rxpo_at(t),
        }
    }

    fn tri_at(t: f32) -> f32 {
        match t {
            0.0..0.5 => t * 2.,
            0.5..1.0 => (1. - t) * 2.,
            _ => 0.,
        }
    }

    fn trap_at(t: f32) -> f32 {
        let up_ramp = 0.0..(1. / 3.);
        let plateau = (1. / 3.)..(2. / 3.);
        let decline = (2. / 3.)..1.0;
        if up_ramp.contains(&t) {
            t * 3.
        } else if plateau.contains(&t) {
            1.
        } else if decline.contains(&t) {
            (1. - t) * 3.
        } else {
            0.
        }
    }

    fn expo_at(t: f32) -> f32 {
        (1. - t).powf(2.)
    }

    fn rxpo_at(t: f32) -> f32 {
        t.powf(2.)
    }
}

impl TryFrom<u32> for Env {
    type Error = ();

    fn try_from(value: u32) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::None),
            1 => Ok(Self::Tri),
            2 => Ok(Self::Trap),
            3 => Ok(Self::Expo),
            4 => Ok(Self::Rxpo),
            _ => Err(()),
        }
    }
}
