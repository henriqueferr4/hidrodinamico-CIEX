import LineChartVazao from "./lineChartVazao";

export default function SidebarVazao({ geojson }) {

    if (!geojson) return null;

    return (
        <div
            style={{
                position: "absolute",
                right: 10,
                top: 10,
                width: 340,
                maxHeight: "95vh",
                overflowY: "auto",
                background: "white",
                borderRadius: 8,
                padding: 10,
                boxShadow: "0px 0px 10px rgba(0,0,0,.3)"
            }}
        >

            {geojson.features.map((feature, i) => (

                <LineChartVazao
                    key={i}
                    nome={`${feature.properties.NORIOCOMP}`}
                    vazao={feature.properties.vazao}
                />

            ))}

        </div>
    );

}