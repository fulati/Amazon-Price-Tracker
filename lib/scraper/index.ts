"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  //BrightData Proxy Configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    //Fetch the product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    //Extract the product title
    const title = $("#productTitle").text().trim();
    const currentPrice = $("span.a-offscreen:first")
      .text()
      .replace(/[^0-9.]/g, "");
    //USED MY OWN STYLE instead of the tutorial
    // extractPrice(
    //   $(".priceToPay span.a-price-whole:first"),
    //   $("a.size.base.a-color-price"),
    //   $(".a-button-selected .a-color-base")
    // );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $(".a-price.a-text-price span.a-offscreen:first"),
      $("#listPrice"),
      $("#priceblock_dealprice"),
      $(".a-size-base.a-color-price")
    );

    const outOfStock =
      $("#availability span").text().trim().toLocaleLowerCase() ===
      "currently unavailable";

    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($(".a-price-symbol"));

    const discountRate = $(".savingsPercentage:first")
      .text()
      .replace(/[-%]/g, "");

    const description = $("#feature-bullets .a-list-item")
      .map(function () {
        return "• " + $(this).text().trim();
      })
      .get()
      .join("\n");

    const reviewsCount = $("#acrCustomerReviewText:first")
      .text()
      .replace(/[^0-9]/g, "");

    const stars = $(".a-icon-alt:first")
      .text()
      .replace(/[^0-9.]/g, "");

    const category = $("span.nav-a-content:first").text().trim();

    //Construct the product object with scraped information
    const data = {
      url,
      currency: currency || "$",
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: category,
      reviewsCount: Number(reviewsCount),
      stars: Number(stars),
      isOutOfStock: outOfStock,
      description: description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      average: Number(currentPrice) || Number(originalPrice),
    };

    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
