use std::f32::consts::PI;

/// Simple multi-channel gain
pub fn gain_frame<const C: usize>(frame: &mut [f32; C], gain: f32) {
    for sample in frame.iter_mut() {
        *sample = *sample * gain;
    }
}

/// Constant power pan
///
/// Source: https://www.kvraudio.com/forum/viewtopic.php?t=148865
pub fn pan_stereo_frame(frame: &mut [f32; 2], pan: f32) {
    let coeff = (PI / 2.) * pan;
    frame[0] = coeff.cos() * frame[0];
    frame[1] = coeff.sin() * frame[1];
}
