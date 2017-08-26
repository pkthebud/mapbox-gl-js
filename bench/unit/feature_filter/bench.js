'use strict';

require('flow-remove-types/register');

const VectorTile = require('@mapbox/vector-tile').VectorTile;
const Pbf = require('pbf');
const fs = require('fs');
const createFilter = require('../../../src/style-spec').featureFilter;
const filters = require('./filters.json');
const path = require('path');

const tile = new VectorTile(new Pbf(fs.readFileSync(path.join(__dirname, './785.vector.pbf'))));

const layers = [];
for (const name in tile.layers) {
    const layer = tile.layers[name];
    if (!layer.length) continue;

    const features = [];
    for (let j = 0; j < layer.length; j++) {
        features.push(layer.feature(j));
    }

    const layerFilters = [];
    for (let j = 0; j < filters.length; j++) {
        if (filters[j].layer === name) layerFilters.push(filters[j].filter);
    }

    layers.push({
        name: name,
        features: features,
        rawFilters: layerFilters
    });
}

const results = [['task', 'iteration', 'time']];

let start = Date.now();
for (let m = 0; m < 100; m++) {
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        layer.filters = [];
        for (let j = 0; j < layer.rawFilters.length; j++) {
            layer.filters.push(createFilter(layer.rawFilters[j]));
        }
    }
    results.push(['create_filter', m, Date.now() - start]);
}

start = Date.now();
for (let m = 0; m < 100; m++) {
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        for (let j = 0; j < layer.features.length; j++) {
            const feature = layer.features[j];
            for (let k = 0; k < layer.filters.length; k++) {
                const filter = layer.filters[k];
                filter(feature);
            }
        }
    }
    results.push(['apply_filter', m, Date.now() - start]);
}

console.log(results.map(row => row.join(',')).join('\n'));

