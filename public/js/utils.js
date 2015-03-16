window.findArtist = function(name){
    return findObjectByStringAttribute(objToArray(artists), "name", name);
};

window.objToArray = function(o) {
    return $.map(o, function(value, index) {
        return [value];
    });
};

window.findObjectByStringAttribute = function(items, attribute, value){
    for (var i = 0; i < items.length; i++) {
        if (typeof items[i][attribute] === 'string' && items[i][attribute].toLowerCase() === value.toLowerCase()) {
            return items[i];
        }
    }
    return null;
};

