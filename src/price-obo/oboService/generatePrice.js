
//type= random, increasing, decreasing, increasingdecreasing
const generatePrice =(maxPrice,minPrice,type)=>{
    const priceDifference = maxPrice- minPrice;
    if(type==="random"){
      const randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
      return randomPrice;
    } else if(type === "increasing"){
        
        let increasedPrice = minPrice;
        increasedPrice= increasedPrice+priceDifference*0.1;
        if(increasedPrice > maxPrice){
            increasedPrice = minPrice+priceDifference*0.1;
        }
        return increasedPrice;
    } else if(type === "decreasing"){
        let decreasedPrice = maxPrice;
        decreasedPrice = decreasedPrice - priceDifference*0.1;
        if(decreasedPrice < minPrice){
            decreasedPrice = maxPrice - priceDifference*0.1;
        }
        return decreasedPrice;
    } else if(type ==="increase-decrease"){
        const unitCount = fetchUnitCount(sku,startDateTime,EndDatetime);
        if(unitCount >=1){
            generatePrice(maxPrice,minPrice,"decreasing");
        }else {
            generatePrice(maxPrice,minPrice,"increasing");
        }
    }
}


