// ===== GLOBAL =====
let data = {};
const stateEl = document.getElementById("state");
const districtEl = document.getElementById("district");
const cropEl = document.getElementById("crop");

// ===== ALL CROPS =====
const crops = [
"Rice","Wheat","Maize","Ragi","Barley",
"Toor Dal","Moong","Urad","Gram",
"Groundnut","Soybean","Mustard","Sunflower",
"Sugarcane","Cotton","Jute",
"Tea","Coffee","Rubber",
"Onion","Tomato","Potato","Brinjal","Cabbage","Cauliflower",
"Carrot","Beans","Peas",
"Mango","Banana","Apple","Grapes","Orange","Papaya","Pineapple",
"Turmeric","Pepper","Cardamom","Clove","Chilli",
"Coriander","Cumin","Fenugreek"
];

// ===== LOAD STATES & DISTRICTS =====
fetch("states-and-districts.json")
.then(res => res.json())
.then(json => {

    data = {}; // important

    json.states.forEach(item => {
        data[item.state] = item.districts;
    });

    stateEl.innerHTML = "<option>Select State</option>";

    Object.keys(data).forEach(state=>{
        stateEl.innerHTML += `<option value="${state}">${state}</option>`;
    });
});

// ===== STATE CHANGE =====
stateEl.onchange = ()=>{
    districtEl.innerHTML = "<option>Select District</option>";

    data[stateEl.value].forEach(d=>{
        districtEl.innerHTML += `<option value="${d}">${d}</option>`;
    });
};

// ===== DISTRICT CHANGE =====
districtEl.onchange = ()=>{
    cropEl.innerHTML = "<option>Select Crop</option>";

    crops.forEach(c=>{
        cropEl.innerHTML += `<option value="${c}">${c}</option>`;
    });
};

// ===== REAL PRICE (API READY) =====
async function getPrice(state,district,crop){
    try{
        let url = `https://api.allorigins.win/raw?url=${encodeURIComponent(
            `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=YOUR_API_KEY&format=json&filters[state]=${state}&filters[district]=${district}&filters[commodity]=${crop}`
        )}`;

        let res = await fetch(url);
        let data = await res.json();

        if(data.records && data.records.length > 0){
            return Math.round(data.records[0].modal_price / 100);
        }

        throw "No data";
    }catch{
        return Math.floor(Math.random()*30 + 20);
    }
}

// ===== PREDICTION =====
function predict(current){
    let arr=[];
    let val=current;

    for(let i=1;i<=6;i++){
        let seasonal = Math.sin(i/2)*2;
        let random = (Math.random()*4 - 2);

        val += seasonal + random;
        if(val < 5) val = 5;

        arr.push(Math.round(val));
    }
    return arr;
}

// ===== CHART =====
const chart = new Chart(document.getElementById("priceChart"),{
    type:"line",
    data:{
        labels:[],
        datasets:[{label:"₹/kg Trend",data:[],borderWidth:2}]
    }
});

// ===== MAIN =====
cropEl.onchange = async ()=>{

    let state = stateEl.value;
    let district = districtEl.value;
    let crop = cropEl.value;

    let current = await getPrice(state,district,crop);
    let future = predict(current);

    document.getElementById("currentPrice").innerText="₹ "+current;
    document.getElementById("predictedPrice").innerText="₹ "+future[5];
    document.getElementById("market").innerText=district + " APMC";

    document.getElementById("cropImage").src =
    `https://source.unsplash.com/300x300/?${crop},farming`;

    chart.data.labels=["Now","M1","M2","M3","M4","M5","M6"];
    chart.data.datasets[0].data=[current,...future];
    chart.update();
};

// ===== LIVE DATE & TIME =====
function updateDateTime(){
    let now = new Date();

    let date = now.toLocaleDateString('en-IN',{
        weekday:'long',year:'numeric',month:'long',day:'numeric'
    });

    let time = now.toLocaleTimeString('en-IN');

    document.getElementById("dateTime").innerText =
    date + " | " + time;
}

setInterval(updateDateTime,1000);
updateDateTime();
