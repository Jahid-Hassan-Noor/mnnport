// Visual magnification for the fictional map. Container records still retain
// their declared 20-foot and 40-foot types; these values control their models.
export const CONTAINER_MODEL_SCALE = 2.3;
export const VEHICLE_MODEL_SCALE = 2.6;
export const YARD_BAYS_PER_ROW = 5;
export const YARD_BAY_PITCH = 29;
export const YARD_FIRST_BAY_X = 141;
export const YARD_ROW_Y = [
  352, 358.2, 371, 377.2, 390, 396.2, 409, 415.2,
  445, 451.2, 463, 469.2, 481, 487.2, 499, 505.2,
  551, 557.2, 570, 576.2,
] as const;
