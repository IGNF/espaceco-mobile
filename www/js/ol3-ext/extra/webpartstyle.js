/** 
* @namespace ol.layer.Vector.Webpart.Style
*/
ol.layer.Vector.Webpart.Style = {};

/** Format string with pattern ${attr}
*	@param {String} pattern
*	@param {ol.Feature} feature width properties
*/
ol.layer.Vector.Webpart.Style.formatProperties = function (format, feature)
{	if (!format || !format.replace || !feature) return format;
	var i = format.replace(/.*\$\{([^\}]*)\}.*/, "$1");
	if (i === format) return format;
	else 
	{	return ol.layer.Vector.Webpart.Style.formatProperties(format.replace("${"+i+"}", feature.get(i)), feature);
	}
};

/** Format Style with pattern ${attr}
*	@param {style} 
*	@param {ol.Feature} feature width properties
*/
ol.layer.Vector.Webpart.Style.formatFeatureStyle = function (fstyle, feature)
{	if (!fstyle) return {};
	var fs = {};
	for (var i in fstyle)
	{	fs[i] = ol.layer.Vector.Webpart.Style.formatProperties (fstyle[i], feature)
	}
	return fs;
};

/** Get stroke style from featureType.style
*	@param {featureType.style | {color,width} | undefined}
*	@return ol.style.Stroke
*/
ol.layer.Vector.Webpart.Style.Stroke = function (fstyle)
{	var stroke = new ol.style.Stroke(
					{	color: fstyle.strokeColor || "#00f",
						width: Number(fstyle.strokeWidth) || 1,
						lineDash: fstyle.dash ? [5,5] : undefined
					});
	if (fstyle.strokeOpacity)
	{	var a = ol.color.asArray(stroke.getColor());
		if (a.length)
		{	a[4] = fstyle.strokeOpacity;
			stroke.setColor(a);
		}
	}
	return stroke;
}

/** Get fill style from featureType.style
*	@param {featureType.style | undefined}
*	@return ol.style.Fill
*/
ol.layer.Vector.Webpart.Style.Fill = function (fstyle)
{	var fill = new ol.style.Fill(
					{	color: fstyle.fillColor || "rgba(255,255,255,0.5)",
					});
	if (fstyle.fillOpacity)
	{	var a = ol.color.asArray(fill.getColor());
		if (a.length)
		{	a[3] = Number(fstyle.fillOpacity);
			fill.setColor(a);
		}
	}
	return fill;
}

/** Get Image style from featureType.style
*	@param {featureType.style |  undefined}
*	@return ol.style.Image
*/
ol.layer.Vector.Webpart.Style.Image = function (fstyle)
{	var image;
	if (fstyle.img)
	{	image = new ol.style.Icon ({
			src: fstyle.img
		});
	}
	else
	{	var radius = Number(fstyle.pointRadius) || 5;
		var graphic = 
			{	cross: [ 4, radius, 0, 0 ],
				square: [ 4, radius, undefined, Math.PI/4 ],
				triangle: [ 3, radius, undefined, 0 ],
				star: [ 5, radius, radius/2, 0 ],
				x: [ 4, radius, 0, Math.PI/4 ]
			}
		switch (fstyle.graphicName)
		{	case "cross": 
			case "star":
			case "square":
			case "triangle":
				var graphic = 
					{	cross: [ 4, radius, 0, 0 ],
						square: [ 4, radius, undefined, Math.PI/4 ],
						triangle: [ 3, radius, undefined, 0 ],
						star: [ 5, radius, radius/2, 0 ],
						x: [ 4, radius, 0, Math.PI/4 ]
					}
				var g = graphic[fstyle.graphicName] || graphic.square;
				image = new ol.style.RegularShape(
					{	points: g[0],
						radius: g[1],
						radius2: g[2],
						rotation: g[3],
						stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
						fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
					})
				break;
			default:
				image = new ol.style.Circle(
						{	radius: radius,
							stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
							fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
						});
				break;
		}
	}
	return image;
};

/** Get Text style from featureType.style
*	@param {featureType.style | undefined}
*	@return ol.style.Text
*/
ol.layer.Vector.Webpart.Style.Text = function (fstyle)
{	return new ol.style.Text(
		{	font: (fstyle.fontWeight || '')
				+ " "
				+ (fstyle.fontSize || "12px")
				+ " "
				+ (fstyle.fontFamily || 'Sans-serif'),
			text: fstyle.label,
			rotation: (fstyle.labelRotation || 0),
			textAlign: "left",
			textBaseline: "middle",
			offsetX: fstyle.labelXOffset||0,
			offsetY: -fstyle.labelYOffset||0,
			stroke: new ol.style.Stroke(
					{	color: fstyle.labelOutlineColor || "#fff",
						width: Number(fstyle.labelOutlineWidth) || 2
					}),
			fill: new ol.style.Fill(
				{	color: fstyle.fontColor
				})
		});
};

/** Get ol.style.function as defined in featureType
* @param {featureType}
* @return { ol.style.function | undefined }
*/
ol.layer.Vector.Webpart.Style.getFeatureStyleFn = function(featureType)
{	if (!featureType) featureType = {};
	if (featureType.name && ol.layer.Vector.Webpart.Style[featureType.name])
	{	return ol.layer.Vector.Webpart.Style[featureType.name](featureType);
	}
	else return function(feature, res)
	{	var fstyle = ol.layer.Vector.Webpart.Style.formatFeatureStyle (featureType.style, feature);
		// Gestion d'une bibliotheque de symboles
		if (featureType.style && featureType.style.name && featureType.symbo_attribute)
		{	fstyle.img = featureType.uri.replace(/gcms\/.*/,"")
				+ "gcms/style/image/"
				+ featureType.style.name
				+ "/" + feature.get(featureType.symbo_attribute.name)
				+"?width="+featureType.style.graphicWidth
				+"&height="+featureType.style.graphicHeight;
		}
		return [	
			new ol.style.Style (
			{	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
				image: ol.layer.Vector.Webpart.Style.Image (fstyle),
				fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
				stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
			})
		];
	}
};

/** Default style
 *	@return {ol.style.Style}
 */
ol.layer.Vector.Webpart.Style.Default = ol.layer.Vector.Webpart.Style.getFeatureStyleFn()()[0];

/** Objets mort-vivant
*/
ol.layer.Vector.Webpart.Style.zombie = function(options)
{	
	function getColor(feature, opacity) 
	{	return ( feature.get('detruit') ? [255,0,0,opacity] : [0,0,255,opacity] );
	};

	return function (feature, res)
	{	var fstyle = {						
			strokeColor: getColor(feature, 1),
			strokeWidth: 2,
			fillColor: getColor(feature, 0.5)
		}	
		return [	
			new ol.style.Style (
			{	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
				image: ol.layer.Vector.Webpart.Style.Image (fstyle),
				fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
				stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
			})
		];
	};
};

/** Objets detruits
*/
ol.layer.Vector.Webpart.Style.detruit = function(options)
{	return function (feature, res)
	{	if (!feature.get('detruit')) return [];
		var fstyle = {						
			strokeColor: [255,0,0,1],
			strokeWidth: 2,
			strokeColor: [255,0,0,0.5]
		}	
		return [	
			new ol.style.Style (
			{	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
				image: ol.layer.Vector.Webpart.Style.Image (fstyle),
				fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
				stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
			})
		];
	};
};

/** Objets vivants
*/
ol.layer.Vector.Webpart.Style.vivant = function(options)
{	return function (feature, res)
	{	if (feature.get('detruit')) return [];
		var fstyle = {						
			strokeColor: [0,0,255,1],
			strokeWidth: 2,
			strokeColor: [0,0,255,0.5]
		}	
		return [	
			new ol.style.Style (
			{	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
				image: ol.layer.Vector.Webpart.Style.Image (fstyle),
				fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
				stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
			})
		];
	};
};

/** Combinaison de style
* @param {ol.style.StyleFunction | Array<ol.style.StyleFunction>}
*/
ol.layer.Vector.Webpart.Style.combine = function(style)
{	if (!(style instanceof Array)) style = [style];
	return function(feature, res)
	{	var s0 = [];
		for (var i=0; i<style.length; i++)
		{	var s = style[i](feature, res);
			for (var k=0; k<s.length; k++) s0.push(s[k]);
		}
		return s0;
	}
}


/** Style des troncon de route DBUni
*/
ol.layer.Vector.Webpart.Style.troncon_de_route = function(options)
{	if (!options) options={};

	function getColor(feature)
	{	if (options.vert && feature.get('itineraire_vert')=="Appartient") 
		{	if (feature.get('position_par_rapport_au_sol') != "0") return "#006400";
			else return "green";
		}
		if (!feature.get('importance')) return "magenta";
		if (feature.get('position_par_rapport_au_sol') != "0")
		{	switch(feature.get('importance'))
			{	case "1": return "#B11BB1"; 
				case "2": return "#B11B1B"; 
				case "3": return "#D97700"; 
				case "4": return "#FFE100"; 
				case "5": return "#CCCCCC"; 
				default: return "#D3D3D3";
			}
		}
		else 
		{	switch(feature.get('importance'))
			{	case "1": return "#FF00FF"; 
				case "2": return "red"; 
				case "3": return "#FFA500"; 
				case "4": return "yellow"; 
				case "5": return "white"; 
				default: return "#D3D3D3";
			}
		}
		return "#808080";
	};

	function getWidth(feature) 
	{	return Math.max ( Number(feature.get('largeur_de_chaussee'))||2 , 2 );
		/*
		if (feature.get('largeur_de_chaussee')) return Math.max (Number(feature.get('largeur_de_chaussee')),2);
		return 2;
		*/
	};

	function getZindex(feature) 
	{	if (!feature.get('position_par_rapport_au_sol')) return 100;
		var pos = Number(feature.get('position_par_rapport_au_sol'));
		if (pos>0) return 10 + pos*10 - (Number(feature.get('importance')) || 10);
		else if (pos<0) return Math.max(4 + pos, 0);
		else return 10 - (Number(feature.get('importance')) || 10);
		return 0;
	};

	return function (feature, res)
	{	var fstyle = {						
			strokeColor: getColor(feature),
			strokeWidth: getWidth(feature)
		}	
		return [	
			new ol.style.Style (
			{	stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
				zIndex: getZindex(feature)-100
			})
		];
	};
}

/** Affichage du sens de parcours
*	@param {Object} attribute (attribut a tester), glyph (lettre), size, direct (valeur), inverse (valeur)
*/
ol.layer.Vector.Webpart.Style.sens = function(options)
{	if (!options) options = 
	{	attribute:'sens_de_circulation', 
		glyph: '\u203A', // '>',
		size: "20px",
		direct:'Sens direct', 
		inverse:'Sens inverse' 
	};

	function fleche(sens)
	{	if (sens == options.direct || sens == options.inverse) return options.glyph;
		return '';
	};
	function lrot(sens, geom) 
	{	if (sens != options.direct && sens != options.inverse) return 0;
		var geo = geom.getCoordinates();
		var x, y, dl=0, l = geom.getLength();
		for (var i=0; i<geo.length-1; i++)
		{	x = geo[i+1][0]-geo[i][0];
			y = geo[i+1][1]-geo[i][1];
			dl += Math.sqrt(x*x+y*y);
			if (dl>=l/2) break;
		}
		if (sens == options.direct) return -Math.atan2(y,x);
		else return Math.PI-Math.atan2(y,x);
	};

	return function (feature, res)
	{	var sens = feature.get(options.attribute)
		var fstyle = 
		{	label: fleche (sens), 
			fontWeight: "bold", 
			fontSize: options.size, 
			labelRotation: lrot(sens, feature.getGeometry())
		}
		return [	
			new ol.style.Style (
			{	text: ol.layer.Vector.Webpart.Style.Text (fstyle)
			})
		];
	};
};

/** Affichage D'un toponyme
*	@param {Object} attribute (attribut a afficher), weight, size, minResolution, maxResolution
*/
ol.layer.Vector.Webpart.Style.toponyme = function(options)
{	if (!options) options = 
	{	attribute:'nom', 
		size: "12px"
	};
	if (!options.minResolution) options.minResolution = 0;
	if (!options.maxResolution) options.maxResolution = 2;

	return function (feature, res)
	{	if (res > options.maxResolution || res < options.minResolution) return [];
		var fstyle = 
		{	label: feature.get(options.attribute), 
			fontWeight: options.weight, 
			fontSize: options.size
		}
		return [	
			new ol.style.Style (
			{	text: ol.layer.Vector.Webpart.Style.Text (fstyle)
			})
		];
	};
};

/** Affichage de la couche batiment
*	@param {Object} symbol (affiche un symbole Fontawesome), color (couleur du symbol) 
*/
ol.layer.Vector.Webpart.Style.batiment = function(options)
{	if (!options) options = {};

	function getColor(feature, opacity) 
	{	switch (feature.get('nature'))
		{	case "Industriel, agricole ou commercial": return [51, 102, 153,opacity];
			case "Remarquable": return [0,192,0,opacity];
			default: 
				switch ( feature.get('fonction') )
				{	case "Indifférenciée": return [128,128,128,opacity];
					case "Sportive": return [51,153,102,opacity];
					case "Religieuse": return [153,102,51,opacity];
					default: return [153,51,51,opacity];
				}
		}
	};

	function getSymbol(feature, opacity) 
	{	switch ( feature.get('fonction') )
		{	case "Commerciale": return "\uf217";
			case "Sportive": return "\uf1e3";
			case "Mairie": return "\uf19c";
			case "Gare": return "\uf239";
			case "Industrielle": return "\uf275";
			default: return null;
		}
	};
	
	return function (feature, res)
	{	if (feature.get('detruit')) return [];
		var fstyle = 
		{	strokeColor: getColor(feature, 1),
			fillColor: getColor(feature, 0.5)
		}
		if (feature.get('etat_de_l_objet')) 
		{	fstyle.dash = true;
			fstyle.fillColor = [0,0,0,0];
		}
		if (options.symbol)
		{	fstyle.label = getSymbol (feature);
			fstyle.fontFamily = "Fontawesome";
			fstyle.fontColor = options.color || "magenta";
		}
		if (fstyle.label)
		{	return [
				new ol.style.Style (
				{	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
					stroke: ol.layer.Vector.Webpart.Style.Stroke (fstyle),
					fill: ol.layer.Vector.Webpart.Style.Fill (fstyle)
				})
			];
		}
		else
		{	return [
				new ol.style.Style (
				{	stroke: ol.layer.Vector.Webpart.Style.Stroke (fstyle),
					fill: ol.layer.Vector.Webpart.Style.Fill (fstyle)
				})
			];
		}
	};
};