window.findArtist = function(name){
    return findObjectByAttribute(objToArray(artists), "name", name);
};

window.objToArray = function(o) {
    return $.map(o, function(value, index) {
        return [value];
    });
};


window.findObjectByAttribute = function(items, attribute, value){
    for (var i = 0; i < items.length; i++) {
        if (items[i][attribute] === value) {
            return items[i];
        }
    }
    return null;
};

