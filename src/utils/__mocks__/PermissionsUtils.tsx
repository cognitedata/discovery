// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const checkForAccessPermission = (..._ignore) => {
  return true;
};

// Assets
export const canReadAssets = (showMessage = true) => {
  return checkForAccessPermission('assetsAcl', 'READ', showMessage);
};
export const canEditAssets = (showMessage = true) => {
  return checkForAccessPermission('assetsAcl', 'WRITE', showMessage);
};

// Files
export const canReadFiles = (showMessage = true) => {
  return checkForAccessPermission('filesAcl', 'READ', showMessage);
};

export const canEditFiles = (showMessage = true) => {
  return checkForAccessPermission('filesAcl', 'WRITE', showMessage);
};

// Events
export const canReadEvents = (showMessage = true) => {
  return checkForAccessPermission('eventsAcl', 'READ', showMessage);
};

export const canEditEvents = (showMessage = true) => {
  return checkForAccessPermission('eventsAcl', 'WRITE', showMessage);
};

// Timeseries
export const canReadTimeseries = (showMessage = true) => {
  return checkForAccessPermission('timeSeriesAcl', 'READ', showMessage);
};

export const canEditTimeseries = (showMessage = true) => {
  return checkForAccessPermission('timeSeriesAcl', 'WRITE', showMessage);
};

// ThreeD
export const canReadThreeD = (showMessage = true) => {
  return checkForAccessPermission('threedAcl', 'READ', showMessage);
};
export const canEditThreeD = (showMessage = true) => {
  return checkForAccessPermission('threedAcl', 'UPDATE', showMessage);
};
export const canDeleteThreeD = (showMessage = true) => {
  return checkForAccessPermission('threedAcl', 'DELETE', showMessage);
};

// Relationships
export const canReadRelationships = (showMessage = true) => {
  return checkForAccessPermission('relationshipsAcl', 'READ', showMessage);
};

export const canEditRelationships = (showMessage = true) => {
  return checkForAccessPermission('relationshipsAcl', 'WRITE', showMessage);
};

// Types
export const canReadTypes = (showMessage = true) => {
  return checkForAccessPermission('typesAcl', 'READ', showMessage);
};

export const canEditTypes = (showMessage = true) => {
  return checkForAccessPermission('typesAcl', 'WRITE', showMessage);
};
