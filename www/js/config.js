/* Your Geoportail API key
*
* Get a developper key on http://api.ign.fr/geoportail/
* Get a full key on http://professionnels.ign.fr/api-web
*/
var apiKey = "mpzzllk4b1eykv4kuw253w02";

// App version
CordovApp.prototype.version = "0.0.07";

CordovApp.prototype.guichets = 
{	haies: { feature: 'haies', database: "haies_gers" },
	bons_plans: { feature: 'bons_plans', database: "demo_guichet" },
	piste_cyclables: { feature: 'piste_cyclable', database: "demo_guichet" },
	passage_pietons: { feature: 'passage_pietons', database: "demo_guichet" },
	usages: { feature: 'usages', database: "demo_guichet" },
	sdis86: { feature: 'hydrants_sdis86', database: "sdis86" },
};
