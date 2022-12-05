import {georemStyle} from 'cordovapp/ol/source/RIPart'
import ol_ext_element from 'ol-ext/util/element'
import RIPart from 'cordovapp/ripart/Ripart'
import Style from 'ol/style/Style';

// Current application
let wapp;

/** Apply filter to a feature
 * @param {ol.Feature} f
 * @return boolean true if feature is not shown
 */
function filterFeature (f) {
  if (!wapp) return false;
  // Cluster ?
  if (f.get('features')) {
    if (f.get('features').length > 2) return false;
    f = f.get('features')[0];
  }
  // Test filter
  const filter = wapp.param.georemFilter;
  if (!filter) return false;
  if (filter.isstatus) {
    if (!filter.status[f.get('ripart').status]) return true;
  }
  if (filter.isdate) {
    if (filter.date > f.get('ripart').maj) return true;
  }
  if (filter.istheme) {
    let found = false;
    f.get('ripart').themes.forEach(t => {
      if (filter.theme[t.theme]) {
        found = true;
      }
    });
    return !found;
  }
  return false;
}

/** Style function with filter
 */
function ripartStyle (theWapp) {
  wapp = theWapp;

  // Init filters dialog
  const input = document.querySelectorAll('#filter input[type="checkbox"]')
  for (let i,k=0; i=input[k]; k++) {
    i.addEventListener('change', (e) => {
      disableList(e.target);
    });
    disableList(i, false);
  }
  document.querySelector('#filter input[type="date"]').addEventListener('change', (e) => {
    wapp.param.georemFilter.date = e.target.value;
    wapp.ripart.signalements.getSource().getSource().changed();
  });

  // Style function
  return function(feature) {
    if (filterFeature(feature)) return new Style();
    else return georemStyle(feature);
  }
}

/** Enable/disable list upon the toggle
 * @param {Element} input
 * @param {boolean} change change parameter, default true
 */
function disableList(input, change) {
  input.parentNode.nextSibling.className = input.checked ? '' : 'disable';
  if (change !== false) {
    wapp.param.georemFilter['is'+input.parentNode.parentNode.className] = input.checked;
    wapp.ripart.signalements.getSource().getSource().changed();
  }
}

/** Set form on show page 
 */
$('#filter').on('showpage', () => {
  if (!wapp.param.georemFilter) wapp.param.georemFilter = { 
    theme: {},
    status: {}
  };
  const filter = wapp.param.georemFilter;
  let ul, toggle;
  // Show themes
  if (wapp.ripart.param.siteProfil.filtre) {
    toggle = document.querySelector('#filter .theme .toggle-right input')
    toggle.checked = filter.istheme;
    disableList(toggle);
    ul = document.querySelector('#filter .theme div');
    ul.innerHTML = '';
    wapp.ripart.param.siteProfil.filtre.forEach(f => {
      f.themes.forEach(t => {
        const label = ol_ext_element.create('LABEL', {
          className: 'checkbox-left theme',
          parent: ul
        });
        ol_ext_element.create('INPUT', {
          type: 'checkbox',
          checked: filter.theme[t],
          on: { 
            'change': (e) => {
              filter.theme[t] = e.target.checked;
              wapp.ripart.signalements.getSource().getSource().changed()
            }
          },
          parent: label
        });
        ol_ext_element.create('SPAN', {
          html: t,
          parent: label
        });
      })
    });
  }
  // Show status
  toggle = document.querySelector('#filter .status .toggle-right input')
  toggle.checked = filter.isstatus;
  disableList(toggle);
  // List
  ul = document.querySelector('#filter .status div');
  ul.innerHTML = '';
  for (let s in RIPart.status) {
    ol_ext_element.create('BUTTON', {
      className: s + (filter.status[s] ? ' selected' : ''),
      html: '<i class="'+s+'"></i> '+RIPart.status[s],
      value: s,
      click: (e) => {
        $(e.target).toggleClass('selected');
        filter.status[e.target.value] = $(e.target).hasClass('selected');
        wapp.ripart.signalements.getSource().getSource().changed()
      },
      parent: ul
    });
  }
  // Show Date
  toggle = document.querySelector('#filter .date .toggle-right input')
  toggle.checked = filter.isdate;
  disableList(toggle);
  document.querySelector('#filter input[type="date"]').value = wapp.param.georemFilter.date;
});

/** Sauvegarde
 */
$('#filter').on('hidepage', () => {
  wapp.saveParam();
});

export {filterFeature}
export default ripartStyle;
