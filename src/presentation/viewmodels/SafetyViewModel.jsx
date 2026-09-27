import { dedupeEmergencyContacts, listChecklist, listCompletedKeys, resetChecklist, setChecklistItemCompleted } from "../../domain/usecases/safety.jsx";
import { callVerifiedEmergencyContact } from "../../domain/usecases/emergencyContacts.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Safety hub: preparation checklist plus offline emergency contacts from packs. */
export class SafetyViewModel extends ViewModel {
  constructor(deps, packRepository) {
    super({
      checklist: [],
      completed: [],
      contacts: [],
      loading: true,
      error: null
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
      error: null
    });
    try {
      const [checklist, completed] = await Promise.all([listChecklist(this.deps), listCompletedKeys(this.deps)]);
      const meta = await this.packRepository.listSavedMeta().catch(() => []);
      const contacts = [];
      for (const entry of meta) {
        const pack = await this.packRepository.getSavedPack(entry.packId).catch(() => null);
        if (!pack) continue;
        for (const contact of pack.safety.emergencyContacts) {
          contacts.push({
            ...contact,
            packName: pack.destination.name
          });
        }
      }
      this.setState({
        checklist,
        completed,
        contacts: dedupeEmergencyContacts(contacts),
        error: null
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Safety information could not be loaded from this device.')
      });
    } finally {
      this.setState({
        loading: false
      });
    }
  };
  toggle = async key => {
    const previous = this.state.completed;
    const nextCompleted = previous.includes(key) ? previous.filter(entry => entry !== key) : [...previous, key];
    this.setState({
      completed: nextCompleted
    });
    try {
      await setChecklistItemCompleted(this.deps, key, nextCompleted.includes(key));
      return true;
    } catch {
      this.setState({
        completed: previous
      });
      return false;
    }
  };
  reset = async () => {
    try {
      await resetChecklist(this.deps);
      this.setState({
        completed: []
      });
    } catch (error) {
      throw new Error(userMessage(error, 'The checklist could not be reset.'));
    }
  };
  callContact = async contact => {
    try {
      await callVerifiedEmergencyContact(this.deps, contact);
      return {
        ok: true,
        message: `Opening ${contact.phone}…`
      };
    } catch (error) {
      return {
        ok: false,
        message: userMessage(error, 'The emergency number could not be opened on this device.')
      };
    }
  };
}
