// This is a placeholder. We can improve this later.
function defaultStageArea(height) {
  return 50000.0; // Example: 50k m^2
}

// Calculates the approximate overflow volume
function overflowVolumeSimple(waterLevel, damCapacity, areaFunc = defaultStageArea) {
  if (waterLevel <= damCapacity) {
    return 0.0;
  }
  const area = areaFunc(damCapacity);
  return (waterLevel - damCapacity) * area;
}

/**
 * Main decision function.
 * Returns an 'action' string and an 'info' object.
 */
function decideGateAction({
  todayLevel,
  yesterdayLevel,
  damCapacity,
  warnFrac = 0.9,
  emergencyMargin = 0.0,
  rateThreshold = 1.0, // e.g., 1.0 meter per day
  areaFunc = defaultStageArea
}) {
  const rateOfChange = todayLevel - yesterdayLevel; // m/day
  const warnThreshold = damCapacity * warnFrac;
  const emergencyThreshold = damCapacity + emergencyMargin;
  const predictedNext = todayLevel + rateOfChange;

  const overflowM3 = overflowVolumeSimple(todayLevel, damCapacity, areaFunc);

  let action;

  // Decision rules (order matters)
  if (todayLevel > emergencyThreshold) {
    action = 'EMERGENCY_RELEASE';
  } else if (todayLevel >= damCapacity) {
    action = 'PREPARE_RELEASE';
  } else if (todayLevel >= warnThreshold) {
    if (rateOfChange >= rateThreshold || predictedNext >= damCapacity) {
      action = 'PREPARE_RELEASE';
    } else {
      action = 'WARN';
    }
  } else {
    if (predictedNext >= damCapacity || rateOfChange >= rateThreshold) {
      action = 'WARN';
    } else {
      action = 'NO_ACTION';
    }
  }

  const info = {
    todayLevelM: todayLevel,
    yesterdayLevelM: yesterdayLevel,
    damCapacityM: damCapacity,
    rateOfChangeMPerDay: rateOfChange,
    predictedNextLevelM: predictedNext,
    overflowM3: overflowM3,
    warnThresholdM: warnThreshold,
    emergencyThresholdM: emergencyThreshold,
    status: action, // 'NO_ACTION', 'WARN', 'PREPARE_RELEASE', 'EMERGENCY_RELEASE'
  };

  return { action, info };
}

// Export the function so api.js can import it
module.exports = { decideGateAction };