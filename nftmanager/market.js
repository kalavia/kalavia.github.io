var ssc;
$.when(
    $.getScript( "./marketUts.js" ),
    $.getScript( "./dialogs.js" ),
    $.getScript( "https://cdn.jsdelivr.net/npm/@hivechain/hivejs/dist/hivejs.min.js" ),
    $.getScript( "https://cdn.jsdelivr.net/npm/sscjs@latest/dist/ssc.min.js" ),
    $.getScript( "https://cdn.datatables.net/plug-ins/1.10.22/pagination/input.js" ),
    $.getScript( "https://cdn.datatables.net/select/1.3.1/js/dataTables.select.min.js" ),
    $.getScript( "https://cdn.datatables.net/searchpanes/1.2.1/js/dataTables.searchPanes.min.js" ),
    $.Deferred(function( deferred ){
        $( deferred.resolve );
    })
).done(function(){
        ssc = new SSC('https://api.hive-engine.com/rpc');  
        readCookie();
});

var APIDataJson = [];
var currentTable = "";
var loggedIn = false;
var currentUser = "";
// var marketData;
localStorage["selected"] = JSON.stringify(new Array());
localStorage["buttonQueue"] = JSON.stringify(new Array());

var page = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1);

// fetches actual data
var getData = function(contract, table, offSet, query) {
    return new Promise(function(resolve, reject) {  
        ssc.find(contract, table, query, 1000, offSet, [], (err, result) => {          
            if (result) {
                resolve(result);
            } else {
                reject(Error("Failed to get JSON data for table "+table+"! ")); 
            }
        });
    });
}

// fetches actual data
var getOneData = function(contract, table, query) {
    return new Promise(function(resolve, reject) { 
        ssc.find(contract, table, query, (err, result) => {
            if (result) {
                resolve(result);
            } else {
                reject(Error("Failed to get JSON data!"));
            }
        });
    });
} 


// returns relevant data
function sortData(data, currentTable) {
        let JSONdata = [];
        //if (page.includes("showMarket")) {
        //    currentTable = new URL(document.URL).searchParams.get("table"); 
        //}
        for (let i = 0 ; i < data.length; i++) { 
            JSONdata.push({});
            switch(currentTable) {
                case 'KATANsellBook': 
                    // JSONdata[i].card = data[i].grouping.class + ": "+ data[i].grouping.type;
                    JSONdata[i].seller = data[i].account;
                    JSONdata[i].nftId = data[i].nftId;
		    JSONdata[i].name = data[i].grouping.name;
                    JSONdata[i].price = parseFloat(data[i].price) 
	            JSONdata[i].priceSymbol = data[i].priceSymbol;
                    break;
                case 'KATANinstances': 
                    // JSONdata[i].card = data[i].grouping.class + ": "+ data[i].grouping.type;
		    JSONdata[i].id = data[i]._id;
		    JSONdata[i].owner = data[i].account;
		    JSONdata[i].name = data[i].properties.name;
		    JSONdata[i].variation = data[i].properties.variation;
		    JSONdata[i].other = data[i].properties.id;
		    JSONdata[i].power = data[i].properties.power;
                    break;
            }
        }
    //console.log("Source data: "+JSON.stringify(data));
    //console.log("Market data: "+JSON.stringify(JSONdata));
    return JSONdata;
}


// loads the UI elements
async function loadMarket() {
    document.getElementById("loadButton").disabled = true;
    clearTableData();
    let table = document.querySelector("#game").value
    currentTable = table;
    table = table + "sellBook";
    // get all data not only first 1000
    let offSet = 0;
    await getData("nftmarket", table, offSet, {}).then( function(result){APIDataJson = sortData(result,"KATANsellBook")});
    
    /*
     * Temporary: retrieve full list with non-null owners:
     * Next step: retrieve list based on IDs retrieved above.
     */
    await getData("nft", "KATANinstances", 0, {'account' : { $ne : 'null'}}).then( function(result){NFTDataJson = sortData(result,"KATANinstances")});
    //console.log(NFTDataJson)

    let isMore = false;
    // if bigger than thousand enters loop with offset
    if (APIDataJson.length == 1000) { // Should be: if 999
            isMore = true;
            offSet += 1000;
        }
    while (isMore) {
        let length1 = APIDataJson.length;  
        let APIDataJsonOld = APIDataJson;
        await getData("nftmarket", table, offSet).then( function(result){ 
            let newData = sortData(result,"KATANsellBook");
            APIDataJson = [...APIDataJsonOld, ...newData];                    
        });
        
        
        let length2 = APIDataJson.length;
        if (length2 - length1 < 1000) { // Should be: if (length2 - length1 < 999)
            isMore = false;
            }
        else {
            offSet += 1000;
        }
    }
    //console.log("API Data: "+JSON.stringify(APIDataJson))
    buildTableDirect(APIDataJson);
}

function buildTableDirect(data) {
    let nfts = [];
    for (i = 0; i < data.length; i++) { // ADD CHECKBOXES BUTTON ETC
        nfts[i] = [];
        if (loggedIn) {
            let btnid = "addbtn" + data[i].nftId ;
            nfts[i].push("<button id ='" + btnid + "' onclick = \"addSelected(" + data[i].nftId + ",'" + data[i].seller + "')\"> Add </button>");  
        }
        else {
            nfts[i].push("<button disabled = 'true'> Login to trade</button>");     
        }
        nfts[i].push(data[i].seller);
        nfts[i].push(data[i].nftId);
        nfts[i].push(data[i].name);
      
	// Retrieve extra values from NFT table.
	//console.log(NFTDataJson)
        var nftAttributes = NFTDataJson.filter(e => e.id == data[i].nftId);
        console.log(nftAttributes); 

	nfts[i].push(nftAttributes[0].variation);
        nfts[i].push(nftAttributes[0].other);
        nfts[i].push(nftAttributes[0].power);

	nfts[i].push(parseFloat(data[i].price) );
        nfts[i].push(data[i].priceSymbol);
        // set button data
        if (loggedIn) {
            if(data[i].seller == currentUser) {
                nfts[i].push("<button onclick='cancelSellOrder(" + data[i].nftId + ")'> Cancel </button>");    
            }
            else {
                nfts[i].push("<button onclick='buyNFT(" + data[i].nftId + ")'> Buy </button>");     
            }
        }
        else {
            nfts[i].push("<button disabled = 'true'> Login to trade</button>");     
        }

    }
    
    let cols = [];
    cols.push({title: "<button id = 'removeAllBtn' style = 'visibility: hidden;' onclick='removeAllSelected()'>Remove all</button>"});
    cols.push({title: "seller"});
    cols.push({title: "nftId"});
    cols.push({title: "name"});
    cols.push({title: "variation"});
    cols.push({title: "other"});
    cols.push({title: "power"});
    cols.push({title: "price"});
    cols.push({title: "priceSymbol"});
    cols.push({title: "Options"})
    
    let searchPaneCols;
	switch(currentTable) {
		case "KATAN": searchPaneCols = [1,3,4]; break;
		case "CITY": searchPaneCols = [1,3,5]; break;
		case "DCROPS": searchPaneCols = [1,3,4,5,7]; break;
		case "NFTSR": searchPaneCols = [1,3,5]; break;
	}
    
    let notOrderable = [0];
    switch(currentTable) {
		case "KATAN": notOrderable.push(6); break;
		case "CITY":  notOrderable.push(6); break;
		case "DCROPS":  notOrderable.push(8); break;
		case "NFTSR":  notOrderable.push(6); break;
	}

    
    var table = $('#table').DataTable({
        "data": nfts,
        "columns": cols,
		"dom": 'Plfrtip',
		"order": [[ 2, "desc" ]],
		"orderClasses": false,
		"pageLength": 100,
		"lengthMenu": [[10, 25, 100, 500, -1], [10, 25, 100, 500, "All (may cause lag)"]],
		"pagingType": 'input',
		"searchPanes": {
			"cascadePanes": true,
            "layout": getPanesLayout(currentTable),
            "columns": searchPaneCols
        },
		"columnDefs": [
		{ "orderable": false, targets: notOrderable}
		]
	});
    
    //console.log(cols)

    table.on( 'draw', updateRemovedButtons);
    document.getElementById("loadButton").disabled = false;
} // end build table

// get the Pane layout switched by table
function getPanesLayout(table) {
    return 'columns-3';
}

function addSelected(item, seller) {
    current = JSON.parse(localStorage["selected"]);
    if (current.length >= 50) {
        alert("You can only add up to 50 NFTs to the cart at the same time.")
        return;
    }
    current.push([item,seller]);
    localStorage["selected"] = JSON.stringify(current);
    let btn = "#addbtn" + item;
    $(btn).html("Remove");
    $(btn).attr("onclick","removeSelected(" + item + ",'" + seller + "')");
    updateRemoveAllButton();
    updateActionButtons();
}

function removeSelected(removeItem, seller) {
    current = JSON.parse(localStorage["selected"]);
    current = jQuery.grep(current, function(item) {
        return item[0] != removeItem;
    });
    localStorage["selected"] = JSON.stringify(current);
    let btn = "#addbtn" + removeItem;
    $(btn).html("Add");   
    $(btn).attr("onclick","addSelected(" + removeItem + ",'" + seller + "')");
    updateRemoveAllButton();
    updateActionButtons();
}

function removeAllSelected() {
    current = JSON.parse(localStorage["selected"]);
    btnqueue = JSON.parse(localStorage["buttonQueue"]);
    current.forEach(function(item) {
        let btn = "#addbtn" + item[0];
        if($("#addbtn" + item[0]).length) {
            removeSelected(item[0],item[1]);     
        }
        else {
            btnqueue.push([item[0],item[1]]);
            removeSelected(item[0],item[1]); 
        }
    });
    localStorage["selected"] = JSON.stringify(new Array());
    localStorage["buttonQueue"] = JSON.stringify(btnqueue);
    updateRemoveAllButton();
    updateActionButtons();
}

// if the remove all button is used the buttons that are currently not rendered are not updated
// this function is called everytime the table is drawn and tries to update the leftover buttons
function updateRemovedButtons() {
    btnqueue = JSON.parse(localStorage["buttonQueue"]);
    btnqueue.forEach(function(removeItem) {
        if($("#addbtn" + removeItem[0]).length) {
            let btn = "#addbtn" + removeItem[0];
            $(btn).html("Add");   
            $(btn).attr("onclick","addSelected(" + removeItem[0] + ",'" + removeItem[1] + "')");   
            btnqueue = jQuery.grep(btnqueue, function(item) {
                return item[0] != removeItem[0];
            });
        }        
    });
    localStorage["buttonQueue"] = JSON.stringify(btnqueue);
}

function updateRemoveAllButton() {
    current = JSON.parse(localStorage["selected"]);
    if (current.length > 0) {
        $("#removeAllBtn").css("visibility", "visible"); 
    }
    else {
        $("#removeAllBtn").css("visibility", "hidden");    
    }
}

function clearTableData() {
    removeAllSelected();
    updateActionButtons();
    APIDataJson = []; 
    localStorage["selected"] = JSON.stringify(new Array());
    localStorage["buttonQueue"] = JSON.stringify(new Array());
    $("#table_wrapper").remove();
    $("#tableArea").prepend("<table id = 'table'> </table>");
}

function getSelected() {
    return JSON.parse(localStorage["selected"]);
}

function getBtnQueue() {
    return JSON.parse(localStorage["buttonQueue"]);
}

  

       

        
                 
                 

