let selectedDevice = null;

function getPrinter() {
  if (localStorage.printer == undefined) {
    console.error("printer didn't set");
    return Error("printer didn't set");
  }

  return JSON.parse(localStorage.printer);
}

async function printToUSBPrinter(text) {
  let receiptText = text;
  console.log(receiptText);

  try {
    if (localStorage.printer == undefined) {
      console.error("No USB printer selected");
      return;
    }

    let printer = JSON.parse(localStorage.printer);
    const devices = await navigator.usb.getDevices();

    const device = devices.find(
      (device) => device.vendorId === printer.vendorId
    );

    if (device) {
      console.log("Found USB device:", device.productName);

      await device.open();

      console.log("Configurations:", device.configurations);
      await device.selectConfiguration(
        device.configurations[0].configurationValue
      );
      console.log(
        "Selected Configuration:",
        device.configuration.configurationValue
      );

      await device.claimInterface(0);
      console.log("Interface 0 claimed");

      const encoder = new TextEncoder();
      const data = encoder.encode(receiptText);

      const endpoints = device.configuration.interfaces[0].alternate.endpoints;
      console.log("Endpoints:", endpoints);

      if (!endpoints.length) {
        throw new Error("No available endpoints found for this device.");
      }

      const endpoint = endpoints.find((ep) => ep.direction === "out");
      if (!endpoint) {
        throw new Error("No OUT endpoint found.");
      }

      await device.transferOut(endpoint.endpointNumber, data);
      console.log("Data sent to printer");
    } else {
      console.log("No USB device with the specified vendor ID found");
      new FilamentNotification()
        .title("You should choose the printer first in printer setting")
        .danger()
        .actions([
          new FilamentNotificationAction("Setting")
            .icon("heroicon-o-cog-6-tooth")
            .button()
            .url("/member/printer"),
        ])
        .send();
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

function padText(
  text,
  length,
  alignRight = false,
  center = false,
  textSize = "normal"
) {
  const sizes = {
    normal: "\x1D\x21\x00", // Normal text
    large: "\x1D\x21\x11", // Large text
  }[textSize];
  let paddedText = text;

  if (center) {
    const padLength = Math.max(0, length - text.length);
    const padStart = Math.floor(padLength / 2);
    const padEnd = Math.ceil(padLength / 2);
    paddedText = " ".repeat(padStart) + text + " ".repeat(padEnd);
  } else if (alignRight) {
    paddedText = text.padStart(length);
  } else {
    paddedText = text.padEnd(length);
  }

  return paddedText;
}

function moneyFormat(number, currency = null) {
  number = parseFloat(number); // Pastikan input angka

  const options = {};

  if (currency) {
    options.style = "currency";
    options.currency = currency;
  } else {
    options.style = "decimal";
    options.minimumFractionDigits = 2;
    options.maximumFractionDigits = 2;
  }

  // Paksa format "en-US" agar tetap menggunakan koma untuk ribuan dan titik untuk desimal
  const formatter = new Intl.NumberFormat("en-US", options);
  return formatter.format(number);
}
