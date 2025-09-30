import wapp from './wapp'
import { getFreeDiskSpaceBytes, getDirectoryUsage, getDirectoryChildrenUsage } from './capacitor-hooks/file-handler'

/**
 * Affichage de la maintenance
 * @param {boolean} nodelay 
 */
wapp.maintenance = function(nodelay) {
  if (!nodelay) {
    $("#maintenance").addClass('calculating')
    $("#maintenance .pie p").text('calcul')
    setTimeout(function() {
      wapp.maintenance(true)
    }, 500)
    return
  }

  const maintenanceEl = $('#maintenance')
  const pieLabel = $("#maintenance .pie p")
  maintenanceEl.addClass('calculating')
  pieLabel.text('calcul')

  function accumulate(cache, name, stats) {
    if (!stats || (!stats.fileCount && !stats.size)) return
    const key = name || 'Divers'
    if (!cache[key]) cache[key] = { nb: 0, size: 0 }
    cache[key].nb += stats.fileCount
    cache[key].size += stats.size
  }

  function renderCache(cache, className) {
    const ul = $("#maintenance .resume")
    let total = 0
    Object.keys(cache).forEach(key => {
      const info = cache[key]
      total += info.size
      $("<li>")
        .append($('<p>').addClass('title').text(key))
        .append($('<p>').text(info.nb + ' fichiers - ' + (info.size / 1024 / 1024).toFixed(2) + ' Mo'))
        .appendTo(ul)
    })
    $("#maintenance .info span." + className).text((total / 1024 / 1024).toFixed(2))
    return total
  }

  function updatePie(totalBytes, freeBytes) {
    const sector = $("#maintenance .pie .sector")
    const sectorFront = $("#maintenance .pie .sector > div")
    const sector50 = $("#maintenance .pie .sector50")
    if (typeof freeBytes !== 'number' || freeBytes <= 0) {
      sector50.hide()
      sector.css({ transform: '' })
      sectorFront.css({ transform: '' })
      if (totalBytes > 0) {
        if (totalBytes / 1024 / 1024 / 1024 > 0.5) {
          pieLabel.text((totalBytes / 1024 / 1024 / 1024).toFixed(1) + ' Go')
        } else {
          pieLabel.text((totalBytes / 1024 / 1024).toFixed(1) + ' Mo')
        }
      } else {
        pieLabel.text('--')
      }
      return
    }

    const angle = totalBytes ? totalBytes / (totalBytes + freeBytes) * 360 : 0
    if (totalBytes / 1024 / 1024 / 1024 > 0.5) {
      pieLabel.text((totalBytes / 1024 / 1024 / 1024).toFixed(1) + ' Go')
    } else if (totalBytes > 0) {
      pieLabel.text((totalBytes / 1024 / 1024).toFixed(1) + ' Mo')
    } else {
      pieLabel.text('0 Mo')
    }

    if (angle < 180) {
      sector50.hide()
      sector.css({ transform: 'rotate(-180deg)' })
      sectorFront.css({ transform: 'rotate(' + (180 + angle) + 'deg)' })
    } else {
      sector50.show()
      sector.css({ transform: 'rotate(' + (angle - 360) + 'deg)' })
      sectorFront.css({ transform: 'rotate(0deg)' })
    }
  }

  Promise.all([
    getFreeDiskSpaceBytes(),
    getDirectoryUsage('FILE/cache-signalements'),
    getDirectoryChildrenUsage('FILE/geoportail'),
    getDirectoryChildrenUsage('FILE/cache')
  ]).then(([freeDiskSpace, signalementsStats, geoportailStats, cacheStats]) => {
    const cacheImage = {}
    const cacheVecteur = {}

    console.log('signalementsStats', signalementsStats)
    console.log('geoportailStats', geoportailStats)
    console.log('cacheStats', cacheStats)

    accumulate(cacheVecteur, 'Signalements', signalementsStats)

    if (geoportailStats && geoportailStats.directories) {
      geoportailStats.directories.forEach(dirStats => {
        let name = dirStats.name || 'Geoportail'
        if (/^G\d*$/.test(name)) {
          const groupId = parseInt(name.replace(/^G/, ''), 10)
          const community = Number.isNaN(groupId) ? null : wapp.userManager.getGroupById(groupId)
          if (community && community.name) name = community.name
        }
        accumulate(cacheImage, name, dirStats)
      })
      if (geoportailStats.rootFiles && geoportailStats.rootFiles.fileCount) {
        accumulate(cacheImage, 'Geoportail', geoportailStats.rootFiles)
      }
    }

    if (cacheStats && cacheStats.directories) {
      cacheStats.directories.forEach(dirStats => {
        let name = dirStats.name || 'Cache'
        if (/^G\d*$/.test(name)) {
          const groupId = parseInt(name.replace(/^G/, ''), 10)
          const community = Number.isNaN(groupId) ? null : wapp.userManager.getGroupById(groupId)
          if (community && community.name) name = community.name
        }
        accumulate(cacheVecteur, name, dirStats)
      })
      if (cacheStats.rootFiles && cacheStats.rootFiles.fileCount) {
        accumulate(cacheVecteur, 'Cache', cacheStats.rootFiles)
      }
    }

    $("#maintenance .resume").html('')
    const totalCache = renderCache(cacheImage, 'cimage') + renderCache(cacheVecteur, 'cvector')

    if (typeof freeDiskSpace === 'number') {
      $("#maintenance .info span.diskspace").text((freeDiskSpace / 1000 / 1000 / 1000).toFixed(1))
      $("#maintenance .info .diskspace-parent-element").show()
    } else { // ios or web - we don't display the diskspace
      $("#maintenance .info span.diskspace").text('--')
      $("#maintenance .info .diskspace-parent-element").hide()
    }

    updatePie(totalCache, typeof freeDiskSpace === 'number' ? freeDiskSpace : null)

    maintenanceEl.removeClass('calculating')
  }).catch(err => {
    console.error('Maintenance data loading failed', err)
    $("#maintenance .info span.diskspace").text('--')
    pieLabel.text('--')
    $("#maintenance .resume").html('')
    maintenanceEl.removeClass('calculating')
  })
}
