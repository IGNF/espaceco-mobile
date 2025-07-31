import ol_Object from 'ol/Object'
import TouchCursorSelect from 'ol-ext/interaction/TouchCursorSelect'
import TouchCursorDraw from 'ol-ext/interaction/TouchCursorDraw'
import TouchCursorModify from 'ol-ext/interaction/TouchCursorModify'
import SnapInteraction from 'ol/interaction/Snap'

import wapp from '../wapp'

/** A TouchCursor to select objects on hovering the cursor
 * @constructor
 * @extends {ol_Object}
 * @param {Object} options
 */
class EditonTools extends ol_Object {
  constructor(options) {
    super();
    const select = this.select = new TouchCursorSelect({
      layerFilter: l => (l === this.layer)
    })
    // Add edit button
    select.addButton({
      className: 'ol-button-info',
      click: () => {
        var f = this.select.getSelection();
        if (f) {
          wapp.showSelect({ features: [f] });
        }
      }
    })
    // Add a delete button
    select.addButton({
      className: 'ol-button-trash',
      click: () => {
        var f = this.select.getSelection();
        if (f) this.layer.getSource().removeFeature(f);
      }
    })
    // Add a create button
    select.addButton({
      className: 'ol-button-geom',
      click: () => {
        if (this.draw[this.geomType]) {
          const coord = select.getPosition();
          select.setActive(false);
          this.draw[this.geomType].setActive(true, coord)
        } else {
          wapp.alert('Géométrie non prise en compte...')
        }
      }
    })
    // Add a modify button
    select.addButton({
      className: 'ol-button-modify',
      click: () => {
        const coord = select.getPosition();
        select.setActive(false);
        this.modify.setActive(true, coord)
      }
    })
    // Quit
    select.addButton({
      className: 'ol-button-quit',
      click: () => this.dispatchEvent({ type: 'quit' })
    });

    // List of snap interactions
    this.snap = [];

    // Draw interactions
    this.draw = {};
    ['Point', 'LineString', 'Polygon'].forEach(g => {
      const drawi = this.draw[g] = new TouchCursorDraw({
        className: 'sketch ' + g,
        type: g,
      })
      drawi.addButton({
        className: 'ol-button-back',
        click: () => {
          const coord = drawi.getPosition();
          drawi.setActive(false);
          select.setActive(true, coord)
        },
        before: true
      });

      drawi.on('drawstart', e => {
        drawi.removeButton('ol-button-trash');
      })
      // Add feature to current layer
      drawi.on('drawend', e => {
        e.feature.isNew = true;
        let source = this.layer.getSource();
        source.addFeature(e.feature)
        wapp.showSelect({ features: [e.feature] });
        wapp.showOnglet('info')
        wapp.editFeature(true, source);
        /*
        drawi.removeButton('ol-button-trash');
        // Undo button
        drawi.addButton({
          className: 'ol-button-trash',
          click: () => {
            this.layer.getSource().removeFeature(e.feature);
            drawi.removeButton('ol-button-trash');
          }
        })
        */
      })
    })

  }
}

/** Set layer to edit
 * @param {CollabVector} [layer]
 */
EditonTools.prototype.setLayer = function(layer) {
  if (layer && layer.get('role').indexOf('edit') == -1) layer = null;
  if (!this.init) {
    this.init = true;
    wapp.map.addInteraction(this.select)
    for (let g in this.draw) {
      wapp.map.addInteraction(this.draw[g])
    }
  }
  this.layer = layer;
  if (layer) {
    const table = layer.get('table');
    this.geomType = table.columns[table.geometry_name].type;
    const geomBt = this.select.getButtonElement(2)
    geomBt.classList.remove('Point')
    geomBt.classList.remove('LineString')
    geomBt.classList.remove('Polygon')
    geomBt.classList.add(this.geomType.replace(/multi/i, ''))
  }
  this.select.setActive(!!layer)
  for (let g in this.draw) {
    this.draw[g].setActive(false)
  }
  // Modify interaction
  if (this.modify) {
    wapp.map.removeInteraction(this.modify)
  }
  this.modify = null;
  if (layer) {
    const modify = this.modify = new TouchCursorModify({
      className: 'sketch modify geom' + this.geomType.replace(/multi/i, ''),
      source: layer.getSource()
    })
    modify.setActive(false)
    wapp.map.addInteraction(this.modify)
    
    if (/Point/.test(this.geomType)) {
      modify.removeButton('ol-button-add');
      modify.removeButton('ol-button-remove');
    }
    modify.addButton({
      className: 'ol-button-back',
      click: () => {
        const coord = modify.getPosition();
        modify.setActive(false);
        this.select.setActive(true, coord)
      },
      before: true
    });
  }
  // Remove snapping
  this.snap.forEach(s => wapp.map.removeInteraction(s));
  this.snap = [];
  // Add Snapping
  if (layer && layer.get('snapTo')) {
    const layerId = {};
    wapp.getLayerGuichet().getLayers().forEach(l => {
      const table = l.get('table');
      if (table) {
        layerId[table.id] = l;
      }
    })
    layer.get('snapTo').forEach(i => {
      const l = layerId[i];
      if (l) {
        const si = new SnapInteraction({
          source: l.getSource()
        })
        this.snap.push(si);
        wapp.map.addInteraction(si);
      }
    })
  }
}

export default new EditonTools