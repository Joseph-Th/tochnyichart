'use strict';

const {
  STANDARD_STATIC_VIEWPORT,
  REGIONAL_STATIC_VIEWPORT
} = require('./workflow-contract');

const IMAGE_OUTPUT_PROFILES = Object.freeze({
  auto: Object.freeze({
    id: 'auto',
    description: 'Recipe-aware static image canvas. Standard charts start at 1600×900 widescreen; regional maps use their maintained wide delivery viewport. The canvas may expand only when required to avoid clipping.',
    adaptive: true
  }),
  landscape: Object.freeze({
    id: 'landscape',
    description: 'Fixed 16:9 widescreen image for general editorial use.',
    width: 1600,
    height: 900,
    adaptive: false
  }),
  square: Object.freeze({
    id: 'square',
    description: 'Fixed square image for square-placement publishing surfaces.',
    width: 1080,
    height: 1080,
    adaptive: false
  }),
  portrait: Object.freeze({
    id: 'portrait',
    description: 'Fixed 4:5 portrait image for narrow publishing surfaces.',
    width: 1080,
    height: 1350,
    adaptive: false
  })
});

function autoViewport(recipe) {
  return recipe === 'map.regional'
    ? { ...REGIONAL_STATIC_VIEWPORT }
    : { ...STANDARD_STATIC_VIEWPORT };
}

function defaultImageProfileId(recipe = '') {
  return recipe === 'map.regional' ? 'auto' : 'landscape';
}

function resolveImageProfile(profileId = 'auto', recipe = '') {
  const requested = String(profileId || 'auto').trim().toLowerCase();
  const profile = IMAGE_OUTPUT_PROFILES[requested];
  if (!profile) {
    throw new Error(
      `Unknown image profile: ${profileId}. Available: ${Object.keys(IMAGE_OUTPUT_PROFILES).join(', ')}.`
    );
  }
  const viewport = requested === 'auto'
    ? autoViewport(recipe)
    : { width: profile.width, height: profile.height };
  return { ...profile, viewport };
}

function listImageProfiles() {
  return Object.values(IMAGE_OUTPUT_PROFILES).map((profile) => ({
    ...profile,
    ...(profile.id === 'auto'
      ? {
          standardViewport: { ...STANDARD_STATIC_VIEWPORT },
          regionalViewport: { ...REGIONAL_STATIC_VIEWPORT }
        }
      : {})
  }));
}

module.exports = {
  IMAGE_OUTPUT_PROFILES,
  defaultImageProfileId,
  resolveImageProfile,
  listImageProfiles
};
