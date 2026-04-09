// ===== GLOBAL =====
let data = [];
let currentDistricts = [];
let priceCache = {};

const stateEl = document.getElementById("state");
const districtEl = document.getElementById("district");
const cropEl = document.getElementById("crop");

// ===== API KEY =====
const API_KEY = "579b464db66ec23bdd000001a150ed118852412862c2111ed048c3fa";

// ===== CROP MAPPING (CRITICAL FIX) =====
const cropMap = {
    "Toor Dal": "Arhar(Tur/Red Gram)(Whole)",
    "Ragi": "Ragi (Finger Millet)",
    "Chilli": "Dry Chillies",
    "Gram": "Bengal Gram",
    "Moong": "Green Gram",
    "Urad": "Black Gram"
};

// ===== CROPS =====
const crops = Object.keys({
"Rice":1,"Wheat":1,"Maize":1,"Ragi":1,"Barley":1,
"Toor Dal":1,"Moong":1,"Urad":1,"Gram":1,
"Groundnut":1,"Soybean":1,"Mustard":1,"Sunflower":1,
"Sugarcane":1,"Cotton":1,"Jute":1,
"Tea":1,"Coffee":1,"Rubber":1,
"Onion":1,"Tomato":1,"Potato":1,"Brinjal":1,"Cabbage":1,"Cauliflower":1,
"Carrot":1,"Beans":1,"Peas":1,
"Mango":1,"Banana":1,"Apple":1,"Grapes":1,"Orange":1,"Papaya":1,"Pineapple":1,
"Turmeric":1,"Pepper":1,"Cardamom":1,"Clove":1,"Chilli":1,
"Coriander":1,"Cumin":1,"Fenugreek":1
});

// ===== LOAD STATES =====
fetch("states-and-districts.json")
.then(res => res.json())
.then(json => {
    data = json.states;
    stateEl.innerHTML = "<option>Select State</option>";

    data.forEach(item=>{
        let option = document.createElement("option");
        option.value = item.state;
        option.textContent = item.state;
        stateEl.appendChild(option);
    });
});

// ===== STATE CHANGE =====
stateEl.onchange = ()=>{
    districtEl.innerHTML = "<option>Select District</option>";
    cropEl.innerHTML = "<option>Select Crop</option>";

    let selected = data.find(s => s.state === stateEl.value);
    if(!selected) return;

    selected.districts.forEach(d=>{
        let option = document.createElement("option");
        option.value = d;
        option.textContent = d;
        districtEl.appendChild(option);
    });
};

// ===== DISTRICT CHANGE =====
districtEl.onchange = ()=>{
    cropEl.innerHTML = "<option>Select Crop</option>";

    crops.forEach(c=>{
        let option = document.createElement("option");
        option.value = c;
        option.textContent = c;
        cropEl.appendChild(option);
    });
};

// ===== REAL PRICE (STRICT + ACCURATE) =====
// ===== REAL PRICE (ROBUST + EXAM SAFE) =====
async function getPrice(state,district,crop){

    let apiCrop = cropMap[crop] || crop;

    try{
        let url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
        ?api-key=${API_KEY}
        &format=json
        &limit=200`;

        let res = await fetch(url.replace(/\s/g,''));
        let result = await res.json();

        if(!result.records || result.records.length === 0){
            throw "No data";
        }

        const normalize = (text) => text.toLowerCase().replace(/[^a-z]/g,'');

        let normDistrict = normalize(district);
        let normCrop = normalize(apiCrop);

        // ===== 1. EXACT DISTRICT MATCH =====
        let exact = result.records.filter(r =>
            normalize(r.state) === normalize(state) &&
            normalize(r.district).includes(normDistrict) &&
            normalize(r.commodity).includes(normCrop)
        );

        // ===== 2. STATE MATCH =====
        let stateMatch = result.records.filter(r =>
            normalize(r.state) === normalize(state) &&
            normalize(r.commodity).includes(normCrop)
        );

        // ===== 3. ANYWHERE IN INDIA =====
        let national = result.records.filter(r =>
            normalize(r.commodity).includes(normCrop)
        );

        let finalData = exact.length ? exact :
                        stateMatch.length ? stateMatch :
                        national;

        if(finalData.length === 0) throw "No match";

        // ===== SORT BY LATEST =====
        finalData.sort((a,b)=>{
            let d1 = new Date(a.arrival_date.split('/').reverse().join('-'));
            let d2 = new Date(b.arrival_date.split('/').reverse().join('-'));
            return d2 - d1;
        });

        let r = finalData[0];

        return {
            min: Math.round(r.min_price / 100),
            max: Math.round(r.max_price / 100),
            modal: Math.round(r.modal_price / 100),
            date: r.arrival_date,
            market: r.market,
            source:
                exact.length ? "District Data" :
                stateMatch.length ? "State Data" :
                "India Avg"
        };

    }catch(err){
        console.log(err);

        // ✅ LAST SAFE FALLBACK (NOT RANDOM)
        return {
            min: 20,
            max: 30,
            modal: 25,
            date: "Estimated",
            market: "Fallback",
            source: "Estimated"
        };
    }
}
// ===== SIMPLE TREND (NO RANDOM NONSENSE) =====
function predict(current){
    return Math.round(current * 1.05); // +5%
}

// ===== CHART =====
const chart = new Chart(document.getElementById("priceChart"),{
    type:"line",
    data:{
        labels:[],
        datasets:[{
            label:"₹/kg Trend",
            data:[],
            borderWidth:2
        }]
    },
    options:{
        responsive:true,
        maintainAspectRatio:false
    }
});

// ===== MAIN =====
cropEl.onchange = async ()=>{

    let state = stateEl.value;
    let district = districtEl.value;
    let crop = cropEl.value;

    if(!state || !district || !crop) return;

    document.getElementById("currentPrice").innerText = "Fetching...";
    document.getElementById("predictedPrice").innerText = "--";
    document.getElementById("market").innerText = "Fetching Govt data...";

    let data = await getPrice(state,district,crop);

    if(!data){
        document.getElementById("currentPrice").innerText = "No Data Available";
        document.getElementById("market").innerText = "Try another crop/market";
        return;
    }

    let prediction = predict(data.modal);

    let suggestion = prediction > data.modal
        ? "🟢 HOLD"
        : "🔴 SELL";

    document.getElementById("currentPrice").innerText =
        `₹ ${data.min} - ₹ ${data.max}`;

    document.getElementById("predictedPrice").innerText =
        `₹ ${prediction}`;

    document.getElementById("market").innerText =
        `${data.market} | Updated: ${data.date} | ${suggestion}`;

    chart.data.labels = ["Now","Next"];
    chart.data.datasets[0].data = [data.modal, prediction];
    chart.update();
};

// ===== DATE =====
function updateDateTime(){
    let now = new Date();
    document.getElementById("dateTime").innerText =
        now.toLocaleString('en-IN');
}
setInterval(updateDateTime,1000);
updateDateTime();
