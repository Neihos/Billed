/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from "@testing-library/dom";
import { ROUTES_PATH } from "../constants/routes.js";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import mockStore from "../__mocks__/store.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the new bill form should be displayed", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const form = screen.getByTestId("form-new-bill");
      expect(form).toBeTruthy();

      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("expense-name")).toBeTruthy();
      expect(screen.getByTestId("amount")).toBeTruthy();
      expect(screen.getByTestId("datepicker")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
    });

    test("Then uploading a valid file should call the API and update the bill", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ email: "test@test.com" })
      );

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["image"], "test.jpg", { type: "image/jpg" });

      // on remplit manuellement files
      Object.defineProperty(fileInput, "files", {
        value: [file],
      });

      // on espionne create du mockStore
      const createSpy = jest.spyOn(mockStore.bills(), "create");

      // on simule l'event attendu par handleChangeFile
      const fakeEvent = {
        preventDefault: jest.fn(),
        target: { value: "C:\\fakepath\\test.jpg" },
      };

      newBill.handleChangeFile(fakeEvent);

      // on attend la promesse de create()
      await createSpy.mock.results[0].value;

      expect(createSpy).toHaveBeenCalled();
      expect(newBill.fileName).toBe("test.jpg");
      expect(newBill.fileUrl).toBe("https://localhost:3456/images/test.jpg");
    });

    test("Then uploading an invalid file should show a format error message", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ email: "test@test.com" })
      );

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["doc"], "test.pdf", {
        type: "application/pdf",
      });

      Object.defineProperty(fileInput, "files", {
        value: [file],
      });

      const fakeEvent = {
        preventDefault: jest.fn(),
        target: { value: "C:\\fakepath\\test.pdf" },
      };

      newBill.handleChangeFile(fakeEvent);

      expect(fileInput.validationMessage).toBe(
        "Le fichier doit être au format jpg, jpeg ou png"
      );
    });

    test("Then submitting the form should call update bill API and redirect to Bills page", async () => {
      // GIVEN : page NewBill affichée
      const html = NewBillUI();
      document.body.innerHTML = html;

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ email: "test@test.com" })
      );

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // on simule un fichier déjà uploadé (handleChangeFile déjà passé)
      newBill.fileUrl = "https://localhost:3456/images/test.jpg";
      newBill.fileName = "test.jpg";

      // on remplit le formulaire
      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Billet de train" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "100" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2024-11-27" },
      });
      fireEvent.change(screen.getByTestId("vat"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("pct"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Trajet client" },
      });

      const updateSpy = jest.spyOn(mockStore.bills(), "update");

      const form = screen.getByTestId("form-new-bill");

      // WHEN : je soumets le formulaire
      fireEvent.submit(form);

      // on attend que la promesse d'update soit résolue
      await updateSpy.mock.results[0].value;

      // THEN : l'API update est appelée
      expect(updateSpy).toHaveBeenCalled();

      // On est redirigé vers la page Bills
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.Bills);
    });
  });
});
