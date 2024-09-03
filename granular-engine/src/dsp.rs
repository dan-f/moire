use std::f32::consts::PI;

/// Constant power pan
///
/// Source: https://www.kvraudio.com/forum/viewtopic.php?t=148865
pub fn pan_stereo_frame(frame: &[f32; 2], pan: f32) -> [f32; 2] {
    let coeff = (PI / 2.) * pan;
    [coeff.cos() * frame[0], coeff.sin() * frame[1]]
}
