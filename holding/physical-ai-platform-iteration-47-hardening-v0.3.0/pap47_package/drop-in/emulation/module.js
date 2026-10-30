/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. Licensed GPL-3.0-only. */
/** Evaluates a declared affine device model and compares its output to observed device data. */
export function emulate({device,input,observed,tolerance=1e-6}={}) {
 const hold=reason=>({outcome:'HOLD',reason});
 if(!device?.id||!Number.isFinite(device.gain)||!Number.isFinite(device.offset))return hold('device requires id and finite affine model gain/offset');
 if(!Number.isFinite(input)||!Number.isFinite(observed)||!Number.isFinite(tolerance)||tolerance<0)return hold('finite input, observed output and non-negative tolerance are required');
 const predicted=device.gain*input+device.offset;if(!Number.isFinite(predicted))return hold('model output is not finite');
 const error=observed-predicted,absoluteError=Math.abs(error),matched=absoluteError<=tolerance;
 return {outcome:matched?'OK':'HOLD',deviceId:device.id,input,predicted,observed,error,absoluteError,tolerance,matched,model:'AFFINE_STATIC_DEVICE_MODEL',qualification:'MODEL_CONFORMANCE_CHECK_NOT_INSTRUCTION_SET_OR_CYCLE_ACCURATE_EMULATION',reason:matched?undefined:'Observed device output outside model tolerance'};
}
