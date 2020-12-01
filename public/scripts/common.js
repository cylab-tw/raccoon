
function check_Date(i_Date) {
    var flag = moment(i_Date, 'YYYYMMDD').isValid();
    if (i_Date.length > 8) {
        flag = false;
    }
    return flag;
}

function get_StudyUID(i_Item) {
    if (i_Item.identifier.value.includes('urn:oid:')) {
        return i_Item.identifier.value.substring(8);
    }
    return i_Item.identifier.value;
}

function get_Series(i_Item) {
    let result = [];
    for (let i = 0; i < i_Item.series.length; i++) {
        result.push(i_Item.series[i]);
    }
    return result;
}

function get_Date_Query(from_Date, end_Date) {

    if (from_Date != "" && end_Date != "") {
        return `${from_Date}-${end_Date}`;
    }
    else if (from_Date != "") {
        return `${from_Date}-`;
    }
    else if (end_Date != "") {
        return `-${end_Date}`;
    }
}

function getQIDOViewerUri(i_Item) {
    let StudyDate = moment(i_Item.started).format('YYYYMMDD').toString() + '-';
    console.log(moment(i_Item.started).format('YYYYMMDD'));
    let PatientName = i_Item.patient[0].name[0].text;
    let PatientID = i_Item.subject.identifier.value;
    let StudyInstanceUID = get_StudyUID(i_Item);
    let qido_uri = `${envConfig.QIDO.http}://${envConfig.QIDO.hostName}/cornerstonetest309/html/start.html?StudyDate=${StudyDate}&PatientName=${PatientName}&PatientID=${PatientID}&StudyInstanceUID=${StudyInstanceUID}`;
    return qido_uri;
}


function get_One_Wado_Url(iItem, isJPG) {
    let studyUID = get_StudyUID(iItem);
    let port = ((envConfig.WADO.port) != "80" | (envConfig.WADO.port) != "443") ? `:${envConfig.WADO.port}` : "";
    let url = `${envConfig.WADO.http}://${envConfig.WADO.hostName}${port}/api/dicom/wado/?requestType=WADO&studyUID=${studyUID}`;
    let seriesList = get_Series(iItem);
    if (isJPG) {
        return `${url}&seriesUID=${seriesList[0].uid}&objectUID=${seriesList[0].instance[0].uid}&contentType=image/jpeg`;
    } else {
        return `wadouri:${url}&seriesUID=${seriesList[0].uid}&objectUID=${seriesList[0].instance[0].uid}&contentType=application/dicom`;
    }
}

function getAllWadoUrl(iItem, isJPG) {
    let studyUID = get_StudyUID(iItem);
    let port = ((envConfig.WADO.port) != "80" | (envConfig.WADO.port) != "443") ? `:${envConfig.WADO.port}` : "";
    let url = `${envConfig.WADO.http}://${envConfig.WADO.hostName}${port}/api/dicom/wado/?requestType=WADO&studyUID=${studyUID}`;
    let seriesList = get_Series(iItem);
    let wadoUrlList = [];
    for (let i = 0; i < seriesList.length; i++) {
        let nowSeries = seriesList[i];
        for (let x = 0; x < nowSeries.instance.length; x++) {
            if (isJPG) {
                wadoUrlList.push(`${url}&seriesUID=${nowSeries.uid}&objectUID=${nowSeries.instance[x].uid}&contentType=image/jpeg`)
            } else {
                wadoUrlList.push(`wadouri:${url}&seriesUID=${nowSeries.uid}&objectUID=${nowSeries.instance[x].uid}&contentType=application/dicom`);
            }
        }
    }
    return wadoUrlList;
}

async function getOneIdentifier(iItem, iUse, mustHave) {
    return new Promise(function (resolve) {
        iItem.oldIdentifier = Array.from(iItem.identifier);
        for (let i = 0; i < iItem.identifier.length; i++) {
            if (iItem.identifier[i].use == iUse) {
                iItem.identifier = Object.assign({}, iItem.identifier[i]);
                return resolve(iItem.identifier);
            }
        }
        if (mustHave) {
            iItem.identifier = Object.assign({}, iItem.identifier[0]);
        } else {
            let emptyIdentifier = {
                value: ""
            }
            iItem.identifier = Object.assign({}, emptyIdentifier);
        }
        return resolve(iItem.identifier);
    });
}

async function sleep(ms = 1) {
    return new Promise(r => setTimeout(r, ms));
}


(function () {
    let Micala = {
        check_Date: (i_Date) => {
            let flag = moment(i_Date, 'YYYYMMDD').isValid();
            if (i_Date.length > 8) {
                flag = false;
            }
            return flag;
        },
        get_StudyUID: (i_Item) => {
            if (i_Item.identifier.value.includes('urn:oid:')) {
                return i_Item.identifier.value.substring(8);
            }
            return i_Item.identifier.value;
        },
        get_Series: (i_Item) => {
            let result = [];
            for (let i = 0; i < i_Item.series.length; i++) {
                result.push(i_Item.series[i]);
            }
            return result;
        },
        get_Date_Query: (from_Date, end_Date) => {
            if (from_Date != "" && end_Date != "") {
                return `${from_Date}-${end_Date}`;
            } else if (from_Date != "") {
                return `${from_Date}-`;
            } else if (end_Date != "") {
                return `-${end_Date}`;
            }
        },
        getQIDOViewerUri: (i_Item) => {
            let StudyDate = moment(i_Item.started).format('YYYYMMDD').toString() + '-';
            let PatientName = i_Item.patient[0].name[0].text;
            let PatientID = i_Item.subject.identifier.value;
            let StudyInstanceUID = get_StudyUID(i_Item);
            let qido_uri = `${envConfig.QIDO.http}://${envConfig.QIDO.hostName}/cornerstonetest309/html/start.html?StudyDate=${StudyDate}&PatientName=${PatientName}&PatientID=${PatientID}&StudyInstanceUID=${StudyInstanceUID}`;
            return qido_uri;
        },
        createMyAutoComplete: (commonService) => {
            const myAucomplete = new autoComplete({
                data: {                              // Data src [Array, Function, Async] | (REQUIRED)
                    src: async () => {
                        return new Promise((resolve) => {
                            // User search query
                            const query = document.querySelector("#txtSearch").value
                            // Fetch External Data Source
                            let dataset = [];
                            commonService.es.getReportSuggestion(query).then(function (res) {
                                dataset = res.data;
                                console.log(dataset);
                                return resolve(dataset);
                            });
                            // Return Fetched data
                        });
                        // API key token
                    },
                    key: ["key"],
                    cache: false
                },
                selector: "#txtSearch",           // Input field selector              | (Optional)
                // Post duration for engine to start | (Optional)
                searchEngine: (query, record) => {
                    const select = {
                        highlight: "autoComplete_highlighted",
                    };
                    const highlight = value => `<span class=${select.highlight}>${value}</span>`;
                    // Loose mode
                    // Search query string sanitized & normalized
                    query = query.replace(/ /g, "");
                    // Array of matching characters
                    let regex = new RegExp(`[${query}]`, "gi");
                    return record.replace(regex, highlight('$&'));
                },          // Search Engine type/mode           | (Optional)

                resultsList: {                       // Rendered results list object      | (Optional)
                    render: true,
                    container: source => {
                        source.setAttribute("id", "txtAutoComplete_list");
                        source.setAttribute("style", "padding-top:10px;position: relative;z-index:1000");
                        source.setAttribute("class", "list-inline");
                    },
                    destination: document.querySelector("#txtSearch"),
                    position: "afterend",
                    element: "ul",
                    navigation: (event, input, resListElement, onSelection, resListData) => {
                        const select = {
                            result: "autoComplete_result",
                            highlight: "autoComplete_highlighted",
                            selectedResult: "autoComplete_selected"
                        };
                        const keys = {
                            ENTER: 13,
                            ARROW_UP: 38,
                            ARROW_DOWN: 40
                        };
                        const li = resListElement.childNodes,
                            liLength = li.length - 1;
                        let liSelected = undefined,
                            next;
                        // Remove selection class
                        const removeSelection = direction => {
                            liSelected.classList.remove("autoComplete_selected");
                            if (direction === 1) {
                                next = liSelected.nextSibling;
                            } else {
                                next = liSelected.previousSibling;
                            }
                        };
                        // Add selection class
                        const highlightSelection = current => {
                            liSelected = current;
                            liSelected.classList.add(select.selectedResult);
                        };
                        // Keyboard action
                        input.onkeydown = event => {
                            if (li.length > 0) {
                                switch (event.keyCode) {
                                    // Arrow Up
                                    case keys.ARROW_UP:
                                        // Prevent cursor relocation
                                        event.preventDefault();
                                        if (liSelected) {
                                            removeSelection(0);
                                            if (next) {
                                                highlightSelection(next);
                                                let id = next.getAttribute("data-id");
                                                onSelection(resListData.list[id]);
                                            } else {
                                                highlightSelection(li[liLength]);
                                                onSelection(resListData.list[liLength]);
                                            }
                                        } else {
                                            highlightSelection(li[liLength]);
                                            onSelection(resListData.list[liLength]);
                                        }
                                        break;
                                    // Arrow Down
                                    case keys.ARROW_DOWN:
                                        if (liSelected) {
                                            removeSelection(1);
                                            if (next) {
                                                highlightSelection(next);
                                                let id = next.getAttribute("data-id");
                                                onSelection(resListData.list[id]);
                                            } else {
                                                highlightSelection(li[0]);
                                                onSelection(resListData.list[0]);
                                            }
                                        } else {
                                            highlightSelection(li[0]);
                                            onSelection(resListData.list[0]);
                                        }
                                        break;
                                    case keys.ENTER:
                                        if (liSelected) {
                                            let id = liSelected.getAttribute("data-id");
                                            console.log(resListData.list[id]);
                                            onSelection(resListData.list[id]);
                                        }
                                        break;
                                }
                            }
                        };
                        // Mouse action
                        li.forEach(selection => {
                            let id = selection.getAttribute("data-id");
                            selection.onmousedown = (event) => {
                                onSelection(resListData.list[id]);
                                const qs = $("#txtSearch").val();
                                const mode = $("#viewAndSearchMode").val();
                                window.location.href = `/search?txtSearch=${qs}&viewAndSearchMode=${mode}`
                            };
                        });
                    }
                },
                maxResults: 5,                         // Max. number of rendered results | (Optional)
                highlight: true,                       // Highlight matching results      | (Optional)
                resultItem: {
                    content: (data, source) => {
                        source.innerHTML = data.match;
                    }
                },
                noResults: () => {                     // Action script on noResults      | (Optional)

                },
                onSelection: feedback => {             // Action script onSelection event | (Optional)

                    const selection = feedback.value.key;
                    $("#txtSearch").val(selection);
                }
            });
        }
    }
    window.Micala = Micala
    return Micala;
})()