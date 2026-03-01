export async function getEcoTips(scores: {
  energy: number;
  transport: number;
  food: number;
  lifestyle: number;
  digital: number;
}, level: string) {

  const prompt = `
    Based on the following carbon footprint scores:
    Energy: ${scores.energy}
    Transport: ${scores.transport}
    Food: ${scores.food}
    Lifestyle: ${scores.lifestyle}
    Digital: ${scores.digital}
    
    Level: ${level}
    
    Give 3 actionable eco tips in JSON format with title, description, impact.
  `;

  try {
    const response = await fetch("/carbon-calculator/api.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    return JSON.parse(text);

  } catch (error) {
    console.error("Error fetching eco tips:", error);

    return [
      { title: "Reduce Meat Consumption", description: "Try Meatless Mondays", impact: "High" }
    ];
  }
}