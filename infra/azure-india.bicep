// =============================================================================
// SwasthyaBillCheck (NMBTP) — Azure India Region (Central India - Pune) Bicep IaC
// =============================================================================

param location string = 'centralindia'
param appName string = 'swasthyabillcheck-nmbtp'

resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${appName}-env'
  location: location
  properties: {}
}

