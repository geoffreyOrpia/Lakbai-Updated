import { callNationalEmergencyHotline } from "../../domain/usecases/emergencyContacts.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

/**
 * Safety hub: immediate 911 access plus destination-specific safety notes
 * from guides the traveler has intentionally saved offline.
 */
export class SafetyViewModel extends ViewModel {
  constructor(deps, packRepository) {
    super({
      destinations: [],
      loading: true,
      error: null,
    });
    this.deps = deps;
    this.packRepository = packRepository;
  }

  onInit = () => {
    void this.load();
  };

  load = async () => {
    this.setState({
      loading: true,
      error: null,
    });
    try {
      const meta = await this.packRepository.listSavedMeta().catch(() => []);
      const packs = await Promise.all(meta.map(entry => (
        this.packRepository.getBundledPack(entry.packId).catch(() => null)
      )));
      const destinations = [];

      for (let index = 0; index < meta.length; index += 1) {
        const entry = meta[index];
        const pack = packs[index];
        const reminders = (pack?.safety?.reminders ?? [])
          .map(reminder => String(reminder).trim())
          .filter(Boolean);
        if (!pack?.destination || !reminders.length) continue;

        destinations.push({
          destinationId: pack.destination.id ?? entry.packId,
          name: pack.destination.name,
          area: pack.destination.area
            ?? pack.destination.municipality
            ?? 'Davao del Norte',
          reminders,
        });
      }

      this.setState({
        destinations,
        error: null,
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Saved destination safety notes could not be loaded.'),
      });
    } finally {
      this.setState({
        loading: false,
      });
    }
  };

  call911 = async () => {
    try {
      await callNationalEmergencyHotline(this.deps);
      return {
        ok: true,
        message: 'Opening the phone dialer for 911…',
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The phone dialer could not be opened for 911 on this device.'),
      };
    }
  };
}
