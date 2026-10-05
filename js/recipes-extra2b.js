// Recettes supplémentaires — lot 2b : végétarien & vegan (quantités POUR 1 PORTION).

const R = (id, name, o) => {
  const { ing, ...rest } = o;
  return { id: 's-' + id, name, ...rest, ingredients: ing.map(([n, qty, unit, cat]) => ({ name: n, qty, unit, cat })) };
};
const HUILE = ['huile d\'olive', 1, 'c.à.s', 'placard'];

export const EXTRA2B_RECIPES = [
  R('chana-masala', 'Chana masala aux épinards & riz basmati', {
    tags: ['vegan', 'sans-gluten'], main: 'legumineuses', time: 35, kcal: 500, keeps: 5, freezable: true,
    ing: [['pois chiches cuits', 130, 'g', 'feculents'], ['tomates concassées', 120, 'g', 'epicerie'], ['oignon', 0.5, '', 'legumes'],
      ['gingembre frais', 5, 'g', 'legumes'], ['garam masala', 1, 'c.à.c', 'placard'], ['épinards frais', 40, 'g', 'legumes'], ['riz basmati', 50, 'g', 'feculents']],
    steps: ['Faire revenir oignon, gingembre et épices.', 'Ajouter tomates et pois chiches, mijoter 20 min.', 'Ajouter les épinards. Servir avec le riz.'],
  }),
  R('curry-thai-tofu', 'Curry thaï de légumes au tofu & riz', {
    tags: ['vegan', 'sans-gluten'], main: 'tofu', time: 30, kcal: 520, keeps: 3, freezable: false,
    ing: [['tofu ferme', 100, 'g', 'proteines'], ['lait de coco', 50, 'ml', 'epicerie'], ['pâte de curry', 1, 'c.à.c', 'epicerie'],
      ['poivron', 0.5, '', 'legumes'], ['courgette', 0.5, '', 'legumes'], ['pois gourmands', 60, 'g', 'legumes'], ['riz basmati', 50, 'g', 'feculents']],
    steps: ['Cuire le riz.', 'Dorer le tofu en cubes.', 'Faire revenir la pâte de curry, ajouter lait de coco et légumes, 8 min.', 'Ajouter le tofu.'],
  }),
  R('tofu-brouille', 'Tofu brouillé aux légumes & pain complet', {
    tags: ['vegan'], main: 'tofu', time: 20, kcal: 420, keeps: 3, freezable: false,
    ing: [['tofu ferme', 130, 'g', 'proteines'], ['curcuma', 0.5, 'c.à.c', 'placard'], ['poivron', 0.5, '', 'legumes'],
      ['épinards frais', 50, 'g', 'legumes'], ['champignons de Paris', 50, 'g', 'legumes'], ['pain complet', 50, 'g', 'feculents']],
    steps: ['Sauter poivron et champignons.', 'Émietter le tofu dans la poêle avec le curcuma, 5 min.', 'Ajouter les épinards. Servir avec le pain.'],
  }),
  R('tofu-teriyaki', 'Tofu teriyaki, brocoli & riz complet', {
    tags: ['vegan'], main: 'tofu', time: 30, kcal: 520, keeps: 3, freezable: false,
    ing: [['tofu ferme', 120, 'g', 'proteines'], ['brocoli', 150, 'g', 'legumes'], ['riz complet', 60, 'g', 'feculents'],
      ['sauce soja', 1, 'c.à.s', 'placard'], ['sirop d\'érable', 0.5, 'c.à.c', 'placard'], ['gingembre frais', 5, 'g', 'legumes'], ['graines de sésame', 5, 'g', 'epicerie']],
    steps: ['Cuire riz et brocoli.', 'Dorer le tofu en tranches.', 'Ajouter soja, sirop et gingembre, laisser caraméliser.', 'Sésame au service.'],
  }),
  R('tofu-cacahuete-soba', 'Tofu sauce cacahuète, crudités & soba', {
    tags: ['vegan'], main: 'tofu', time: 25, kcal: 590, keeps: 3, freezable: false,
    ing: [['tofu ferme', 110, 'g', 'proteines'], ['beurre de cacahuète', 15, 'g', 'epicerie'], ['nouilles soba', 60, 'g', 'feculents'],
      ['carotte', 0.5, '', 'legumes'], ['concombre', 0.3, '', 'legumes'], ['sauce soja', 1, 'c.à.s', 'placard'], ['citron vert', 0.25, '', 'legumes']],
    steps: ['Cuire et rincer les soba.', 'Dorer le tofu.', 'Sauce : beurre de cacahuète, soja, citron vert, eau chaude.', 'Assembler avec les crudités en julienne.'],
  }),
  R('gratin-patate-chevre', 'Gratin de patate douce, épinards & chèvre', {
    tags: ['vegetarien', 'sans-gluten'], main: 'fromage', time: 50, kcal: 420, keeps: 4, freezable: true,
    ing: [['patate douce', 200, 'g', 'legumes'], ['épinards frais', 80, 'g', 'legumes'], ['chèvre frais', 30, 'g', 'cremerie'],
      ['lait demi-écrémé', 60, 'ml', 'cremerie'], ['ail', 1, 'gousse', 'legumes']],
    steps: ['Faire tomber les épinards avec l\'ail.', 'Alterner patate douce en fines rondelles et épinards.', 'Verser le lait, émietter le chèvre, cuire 40 min à 180 °C.'],
  }),
  R('lasagnes-legumes', 'Lasagnes aux légumes du soleil & mozzarella', {
    tags: ['vegetarien'], main: 'fromage', time: 70, kcal: 480, keeps: 4, freezable: true,
    ing: [['plaques de lasagne', 60, 'g', 'feculents'], ['courgette', 0.5, '', 'legumes'], ['aubergine', 0.3, '', 'legumes'],
      ['poivron', 0.5, '', 'legumes'], ['coulis de tomate', 120, 'g', 'epicerie'], ['mozzarella', 30, 'g', 'cremerie']],
    steps: ['Faire revenir les légumes en dés 15 min, ajouter le coulis.', 'Alterner plaques et sauce aux légumes.', 'Finir par la mozzarella, cuire 40 min à 180 °C.'],
  }),
  R('gratin-pates-legumes', 'Gratin de pâtes complètes aux légumes', {
    tags: ['vegetarien'], main: 'cereales', time: 40, kcal: 530, keeps: 4, freezable: true,
    ing: [['pâtes complètes', 70, 'g', 'feculents'], ['brocoli', 80, 'g', 'legumes'], ['courgette', 0.5, '', 'legumes'],
      ['lait demi-écrémé', 100, 'ml', 'cremerie'], ['farine', 8, 'g', 'epicerie'], ['emmental râpé', 20, 'g', 'cremerie']],
    steps: ['Cuire pâtes et brocoli.', 'Faire revenir la courgette.', 'Béchamel légère, mélanger le tout, parsemer d\'emmental.', 'Gratiner 20 min à 200 °C.'],
  }),
  R('galettes-sarrasin', 'Galettes de sarrasin complètes épinards-champignons', {
    tags: ['vegetarien', 'sans-gluten'], main: 'oeuf', time: 20, kcal: 440, keeps: 2, freezable: false,
    ing: [['galettes de sarrasin', 2, '', 'feculents'], ['œufs', 1, '', 'cremerie'], ['épinards frais', 80, 'g', 'legumes'],
      ['champignons de Paris', 50, 'g', 'legumes'], ['emmental râpé', 15, 'g', 'cremerie']],
    steps: ['Préparer la garniture à l\'avance : champignons et épinards sautés.', 'Le jour J : galette dans la poêle, garniture, œuf et emmental.', 'Replier, cuire 3 min.'],
  }),
  R('quesadillas', 'Quesadillas haricots noirs, poivron & fromage', {
    tags: ['vegetarien'], main: 'legumineuses', time: 20, kcal: 560, keeps: 3, freezable: true,
    ing: [['tortillas complètes', 2, '', 'feculents'], ['haricots noirs cuits', 80, 'g', 'feculents'], ['poivron', 0.5, '', 'legumes'],
      ['maïs en conserve', 30, 'g', 'epicerie'], ['emmental râpé', 25, 'g', 'cremerie'], ['salade verte', 30, 'g', 'legumes']],
    steps: ['Sauter poivron, haricots et maïs.', 'Garnir une moitié de tortilla, ajouter l\'emmental, replier.', 'Dorer 2 min par face.'],
  }),
  R('bolo-lentilles-corail', 'Bolognaise de lentilles corail & spaghetti complets', {
    tags: ['vegetarien'], main: 'legumineuses', time: 35, kcal: 520, keeps: 5, freezable: true,
    ing: [['lentilles corail', 50, 'g', 'feculents'], ['carotte', 0.5, '', 'legumes'], ['oignon', 0.5, '', 'legumes'],
      ['coulis de tomate', 150, 'g', 'epicerie'], ['spaghetti complets', 80, 'g', 'feculents'], ['parmesan', 10, 'g', 'cremerie'],
      ['herbes de Provence', 0.5, 'c.à.c', 'placard']],
    steps: ['Faire revenir oignon et carotte hachés.', 'Ajouter lentilles, coulis, herbes et un verre d\'eau ; 20 min.', 'Cuire les spaghetti. Parmesan au service.'],
  }),
  R('risotto-butternut', 'Risotto de butternut à la sauge', {
    tags: ['vegetarien', 'sans-gluten'], main: 'cereales', time: 40, kcal: 490, keeps: 2, freezable: false,
    ing: [['riz rond (arborio)', 70, 'g', 'feculents'], ['courge butternut', 150, 'g', 'legumes'], ['oignon', 0.3, '', 'legumes'],
      ['parmesan', 15, 'g', 'cremerie'], ['bouillon de légumes (cube)', 0.25, '', 'placard'], ['sauge séchée', 0.5, 'c.à.c', 'placard']],
    steps: ['Faire revenir oignon et butternut en petits dés.', 'Ajouter le riz puis le bouillon louche par louche, 20 min.', 'Parmesan et sauge en fin de cuisson.'],
  }),
  R('pates-champignons-ricotta', 'Pâtes complètes champignons, épinards & ricotta', {
    tags: ['vegetarien'], main: 'fromage', time: 20, kcal: 520, keeps: 3, freezable: false,
    ing: [['pâtes complètes', 70, 'g', 'feculents'], ['champignons de Paris', 100, 'g', 'legumes'], ['épinards frais', 60, 'g', 'legumes'],
      ['ricotta', 40, 'g', 'cremerie'], ['ail', 1, 'gousse', 'legumes'], ['parmesan', 10, 'g', 'cremerie']],
    steps: ['Cuire les pâtes.', 'Sauter ail et champignons, ajouter les épinards.', 'Mélanger avec pâtes, ricotta et un peu d\'eau de cuisson.'],
  }),
  R('soupe-hiver-lentilles', 'Soupe de légumes d\'hiver & lentilles', {
    inDish: ['lentilles vertes'], tags: ['vegan'], main: 'legumineuses', time: 45, kcal: 380, keeps: 5, freezable: true,
    ing: [['lentilles vertes', 40, 'g', 'feculents'], ['carotte', 1, '', 'legumes'], ['navet', 0.5, '', 'legumes'],
      ['poireau', 0.3, '', 'legumes'], ['pommes de terre', 80, 'g', 'feculents'], ['bouillon de légumes (cube)', 0.25, '', 'placard'], ['pain complet', 40, 'g', 'feculents']],
    steps: ['Faire revenir le poireau.', 'Ajouter légumes en dés, lentilles et bouillon (400 ml par portion) ; 35 min.', 'Servir avec le pain.'],
  }),
  R('veloute-patate-coco', 'Velouté de patate douce, coco & gingembre', {
    tags: ['vegan'], main: 'legumineuses', time: 30, kcal: 450, keeps: 4, freezable: true,
    ing: [['patate douce', 250, 'g', 'legumes'], ['lait de coco', 40, 'ml', 'epicerie'], ['gingembre frais', 5, 'g', 'legumes'],
      ['oignon', 0.3, '', 'legumes'], ['pois chiches cuits', 50, 'g', 'feculents'], ['pain complet', 40, 'g', 'feculents']],
    steps: ['Cuire patate douce, oignon et gingembre dans 300 ml d\'eau par portion, 20 min.', 'Mixer avec le lait de coco.', 'Pois chiches grillés à la poêle en topping.'],
  }),
  R('soupe-tomates-haricots', 'Soupe de tomates rôties & haricots blancs', {
    tags: ['vegetarien'], main: 'legumineuses', time: 45, kcal: 400, keeps: 4, freezable: true,
    ing: [['tomates', 2, '', 'legumes'], ['haricots blancs cuits', 80, 'g', 'feculents'], ['oignon', 0.3, '', 'legumes'],
      ['ail', 1, 'gousse', 'legumes'], ['basilic frais', 0.1, 'botte', 'legumes'], ['pain complet', 40, 'g', 'feculents'], ['parmesan', 10, 'g', 'cremerie']],
    steps: ['Rôtir tomates, oignon et ail 30 min à 200 °C.', 'Mixer avec la moitié des haricots et un peu d\'eau.', 'Ajouter le reste des haricots et le basilic.'],
  }),
  R('muffins-oeufs', 'Muffins aux œufs & légumes, salade', {
    tags: ['vegetarien', 'sans-gluten'], main: 'oeuf', time: 30, kcal: 360, keeps: 4, freezable: true,
    ing: [['œufs', 2, '', 'cremerie'], ['poivron', 0.5, '', 'legumes'], ['épinards frais', 40, 'g', 'legumes'],
      ['feta', 20, 'g', 'cremerie'], ['lait demi-écrémé', 30, 'ml', 'cremerie'], ['salade verte', 40, 'g', 'legumes']],
    steps: ['Battre œufs et lait.', 'Répartir poivron en dés, épinards et feta dans des moules à muffins, verser les œufs.', 'Cuire 20 min à 180 °C.'],
  }),
  R('tarte-poireaux-chevre', 'Tarte poireaux-chèvre sur pâte complète', {
    tags: ['vegetarien'], main: 'fromage', time: 50, kcal: 480, keeps: 3, freezable: true,
    ing: [['pâte brisée complète', 0.2, '', 'feculents'], ['poireau', 1, '', 'legumes'], ['œufs', 1, '', 'cremerie'],
      ['lait demi-écrémé', 50, 'ml', 'cremerie'], ['chèvre frais', 25, 'g', 'cremerie'], ['salade verte', 40, 'g', 'legumes']],
    steps: ['Fondre les poireaux 15 min.', 'Les étaler sur la pâte, verser œufs battus avec le lait.', 'Ajouter le chèvre, cuire 30 min à 190 °C.'],
  }),
  R('aloo-gobi', 'Curry chou-fleur, pommes de terre & pois chiches', {
    tags: ['vegan', 'sans-gluten'], main: 'legumineuses', time: 40, kcal: 440, keeps: 4, freezable: true,
    ing: [['chou-fleur', 0.3, '', 'legumes'], ['pommes de terre', 100, 'g', 'feculents'], ['pois chiches cuits', 60, 'g', 'feculents'],
      ['tomates concassées', 80, 'g', 'epicerie'], ['curcuma', 0.5, 'c.à.c', 'placard'], ['cumin', 1, 'c.à.c', 'placard'], ['riz basmati', 40, 'g', 'feculents']],
    steps: ['Faire revenir les épices, ajouter pommes de terre et chou-fleur.', 'Ajouter tomates et un verre d\'eau, couvrir 20 min.', 'Ajouter les pois chiches. Servir avec le riz.'],
  }),
  R('salade-quinoa-butternut', 'Salade quinoa, butternut rôtie & feta', {
    tags: ['vegetarien', 'sans-gluten'], main: 'fromage', time: 35, kcal: 480, keeps: 4, freezable: false,
    ing: [['quinoa', 50, 'g', 'feculents'], ['courge butternut', 150, 'g', 'legumes'], ['feta', 30, 'g', 'cremerie'],
      ['épinards frais', 40, 'g', 'legumes'], ['graines de courge', 10, 'g', 'epicerie'], HUILE],
    steps: ['Rôtir la butternut en cubes 25 min à 200 °C.', 'Cuire le quinoa.', 'Assembler avec les épinards, la feta et les graines.'],
  }),
  R('taboule-libanais', 'Taboulé libanais aux pois chiches', {
    tags: ['vegan'], main: 'legumineuses', time: 20, kcal: 450, keeps: 3, freezable: false,
    ing: [['boulgour', 40, 'g', 'feculents'], ['persil frais', 0.3, 'botte', 'legumes'], ['menthe fraîche', 0.1, 'botte', 'legumes'],
      ['tomates', 1, '', 'legumes'], ['pois chiches cuits', 80, 'g', 'feculents'], ['citron', 0.5, '', 'legumes'], HUILE],
    steps: ['Cuire le boulgour, refroidir.', 'Ciseler finement persil et menthe, couper les tomates.', 'Mélanger tout avec citron et huile.'],
  }),
  R('boulettes-lentilles', 'Boulettes de lentilles, sauce tomate & spaghetti', {
    tags: ['vegetarien'], main: 'legumineuses', time: 50, kcal: 560, keeps: 4, freezable: true,
    ing: [['lentilles vertes', 50, 'g', 'feculents'], ['flocons d\'avoine', 15, 'g', 'feculents'], ['œufs', 0.25, '', 'cremerie'],
      ['coulis de tomate', 120, 'g', 'epicerie'], ['spaghetti complets', 70, 'g', 'feculents'], ['parmesan', 10, 'g', 'cremerie']],
    steps: ['Cuire les lentilles, les écraser avec l\'avoine et l\'œuf.', 'Former des boulettes, cuire 20 min à 200 °C.',
      'Les mijoter 10 min dans le coulis.', 'Cuire les spaghetti.'],
  }),
  R('stroganoff-champignons', 'Stroganoff de champignons & riz complet', {
    tags: ['vegetarien', 'sans-gluten'], main: 'cereales', time: 30, kcal: 430, keeps: 3, freezable: true,
    ing: [['champignons de Paris', 200, 'g', 'legumes'], ['oignon', 0.5, '', 'legumes'], ['paprika', 1, 'c.à.c', 'placard'],
      ['crème légère 15 %', 40, 'ml', 'cremerie'], ['moutarde', 0.5, 'c.à.c', 'placard'], ['riz complet', 60, 'g', 'feculents']],
    steps: ['Cuire le riz.', 'Dorer oignon et champignons à feu vif.', 'Ajouter paprika, crème et moutarde, 5 min.'],
  }),
  R('haricots-creole', 'Haricots rouges à la créole & riz', {
    tags: ['vegan', 'sans-gluten'], main: 'legumineuses', time: 35, kcal: 520, keeps: 5, freezable: true,
    ing: [['haricots rouges cuits', 130, 'g', 'feculents'], ['tomates concassées', 100, 'g', 'epicerie'], ['poivron', 0.5, '', 'legumes'],
      ['oignon', 0.5, '', 'legumes'], ['colombo (épices)', 1, 'c.à.c', 'placard'], ['riz basmati', 50, 'g', 'feculents']],
    steps: ['Faire revenir oignon, poivron et épices.', 'Ajouter tomates et haricots, mijoter 20 min.', 'Servir avec le riz.'],
  }),
  R('polenta-ratatouille', 'Polenta crémeuse, ratatouille & parmesan', {
    tags: ['vegetarien', 'sans-gluten'], main: 'cereales', time: 50, kcal: 430, keeps: 4, freezable: true,
    ing: [['polenta', 50, 'g', 'feculents'], ['courgette', 0.5, '', 'legumes'], ['aubergine', 0.3, '', 'legumes'],
      ['poivron', 0.5, '', 'legumes'], ['tomates', 1, '', 'legumes'], ['parmesan', 15, 'g', 'cremerie'], HUILE],
    steps: ['Ratatouille : légumes en dés revenus puis mijotés 35 min.', 'Cuire la polenta avec la moitié du parmesan.', 'Servir avec le reste du parmesan.'],
  }),
  R('aubergines-farcies', 'Aubergines farcies aux lentilles & feta', {
    tags: ['vegetarien', 'sans-gluten'], main: 'legumineuses', time: 60, kcal: 400, keeps: 4, freezable: true,
    ing: [['aubergine', 0.5, '', 'legumes'], ['lentilles vertes', 40, 'g', 'feculents'], ['tomates concassées', 80, 'g', 'epicerie'],
      ['feta', 25, 'g', 'cremerie'], ['oignon', 0.3, '', 'legumes'], ['cumin', 0.5, 'c.à.c', 'placard']],
    steps: ['Rôtir les demi-aubergines 25 min à 200 °C, récupérer la chair.', 'Cuire les lentilles.', 'Mélanger chair, lentilles, oignon, tomates et cumin.',
      'Farcir, ajouter la feta, cuire 20 min.'],
  }),
  R('courgettes-farcies-quinoa', 'Courgettes farcies quinoa, tomates & mozzarella', {
    tags: ['vegetarien', 'sans-gluten'], main: 'cereales', time: 50, kcal: 390, keeps: 3, freezable: false,
    ing: [['courgette', 1.5, '', 'legumes'], ['quinoa', 40, 'g', 'feculents'], ['tomates concassées', 80, 'g', 'epicerie'],
      ['mozzarella', 25, 'g', 'cremerie'], ['basilic frais', 0.1, 'botte', 'legumes']],
    steps: ['Cuire le quinoa.', 'Évider les courgettes coupées en deux, hacher la chair.', 'Mélanger chair, quinoa, tomates et basilic ; farcir.',
      'Mozzarella dessus, cuire 30 min à 190 °C.'],
  }),
  R('bowl-betterave-chevre', 'Bowl lentilles beluga, betterave & chèvre', {
    tags: ['vegetarien', 'sans-gluten'], main: 'legumineuses', time: 25, kcal: 480, keeps: 3, freezable: false,
    ing: [['lentilles beluga', 60, 'g', 'feculents'], ['betterave cuite', 1, '', 'legumes'], ['chèvre frais', 30, 'g', 'cremerie'],
      ['roquette', 30, 'g', 'legumes'], ['noix', 10, 'g', 'epicerie'], ['vinaigre de cidre', 1, 'c.à.c', 'placard']],
    steps: ['Cuire les lentilles, refroidir.', 'Couper la betterave en dés.', 'Assembler ; chèvre, noix et roquette au moment de servir.'],
  }),
  R('poke-tofu', 'Poke bowl tofu mariné, mangue & edamame', {
    tags: ['vegan'], main: 'tofu', time: 25, kcal: 560, keeps: 2, freezable: false,
    ing: [['tofu ferme', 100, 'g', 'proteines'], ['riz basmati', 60, 'g', 'feculents'], ['mangue', 0.3, '', 'legumes'],
      ['edamame surgelés', 50, 'g', 'surgeles'], ['concombre', 0.3, '', 'legumes'], ['sauce soja', 1, 'c.à.s', 'placard'], ['graines de sésame', 5, 'g', 'epicerie']],
    steps: ['Mariner le tofu en cubes dans la sauce soja.', 'Cuire riz et edamame.', 'Couper mangue et concombre.', 'Assembler, sésame au service.'],
  }),
  R('udon-legumes-tofu', 'Nouilles udon sautées aux légumes & tofu', {
    tags: ['vegan'], main: 'tofu', time: 20, kcal: 520, keeps: 3, freezable: false,
    ing: [['nouilles udon', 150, 'g', 'feculents'], ['tofu ferme', 90, 'g', 'proteines'], ['chou vert', 0.15, '', 'legumes'],
      ['carotte', 0.5, '', 'legumes'], ['champignons de Paris', 60, 'g', 'legumes'], ['sauce soja', 1, 'c.à.s', 'placard']],
    steps: ['Dorer le tofu, réserver.', 'Sauter chou, carotte et champignons.', 'Ajouter udon, tofu et soja, 3 min.'],
  }),
  R('socca-legumes', 'Socca (galette de pois chiches) & légumes rôtis', {
    tags: ['vegan', 'sans-gluten'], main: 'legumineuses', time: 45, kcal: 420, keeps: 3, freezable: false,
    ing: [['farine de pois chiches', 50, 'g', 'epicerie'], ['courgette', 0.5, '', 'legumes'], ['poivron', 0.5, '', 'legumes'],
      ['oignon rouge', 0.3, '', 'legumes'], ['salade verte', 30, 'g', 'legumes'], HUILE],
    steps: ['Mélanger farine de pois chiches et 2 fois son volume d\'eau, repos 30 min.', 'Rôtir les légumes 25 min à 220 °C.',
      'Cuire la socca à la poêle comme une grande crêpe épaisse.', 'Servir avec légumes et salade.'],
  }),
  R('pates-brocoli-amandes', 'Pâtes complètes au brocoli, ail & amandes', {
    tags: ['vegetarien'], main: 'cereales', time: 20, kcal: 540, keeps: 3, freezable: false,
    ing: [['pâtes complètes', 80, 'g', 'feculents'], ['brocoli', 150, 'g', 'legumes'], ['ail', 1, 'gousse', 'legumes'],
      ['amandes effilées', 10, 'g', 'epicerie'], ['parmesan', 10, 'g', 'cremerie'], HUILE],
    steps: ['Cuire pâtes et brocoli ensemble.', 'Dorer ail et amandes dans l\'huile.', 'Mélanger, écraser un peu le brocoli. Parmesan au service.'],
  }),
  R('saag-tofu', 'Curry de tofu aux épinards (saag) & riz', {
    tags: ['vegan', 'sans-gluten'], main: 'tofu', time: 30, kcal: 470, keeps: 3, freezable: true,
    ing: [['tofu ferme', 120, 'g', 'proteines'], ['épinards frais', 150, 'g', 'legumes'], ['oignon', 0.5, '', 'legumes'],
      ['gingembre frais', 5, 'g', 'legumes'], ['garam masala', 1, 'c.à.c', 'placard'], ['lait de coco', 30, 'ml', 'epicerie'], ['riz basmati', 50, 'g', 'feculents']],
    steps: ['Faire tomber les épinards, les mixer avec le lait de coco.', 'Faire revenir oignon, gingembre et épices, ajouter la purée d\'épinards.',
      'Ajouter le tofu doré, 5 min.', 'Servir avec le riz.'],
  }),
  R('chou-rouge-braise', 'Chou rouge braisé aux pommes & haricots blancs', {
    tags: ['vegan'], main: 'legumineuses', time: 50, kcal: 390, keeps: 5, freezable: true,
    ing: [['chou rouge', 150, 'g', 'legumes'], ['pomme', 0.5, '', 'legumes'], ['haricots blancs cuits', 100, 'g', 'feculents'],
      ['oignon', 0.5, '', 'legumes'], ['vinaigre de cidre', 1, 'c.à.c', 'placard'], ['pain complet', 40, 'g', 'feculents']],
    steps: ['Faire revenir l\'oignon.', 'Ajouter chou émincé, pomme en dés, vinaigre et un fond d\'eau ; braiser 40 min.', 'Ajouter les haricots 5 min.'],
  }),
  R('huevos-rancheros', 'Bowl huevos rancheros, patate douce & haricots noirs', {
    tags: ['vegetarien', 'sans-gluten'], main: 'oeuf', time: 35, kcal: 520, keeps: 3, freezable: false,
    ing: [['œufs', 2, '', 'cremerie'], ['patate douce', 120, 'g', 'legumes'], ['haricots noirs cuits', 60, 'g', 'feculents'],
      ['tomates concassées', 80, 'g', 'epicerie'], ['avocat', 0.3, '', 'legumes'], ['cumin', 0.5, 'c.à.c', 'placard']],
    steps: ['Rôtir la patate douce en cubes 25 min à 200 °C.', 'Mijoter tomates, haricots et cumin 10 min (se prépare à l\'avance).',
      'Le jour J : œufs au plat sur le bol, avocat.'],
  }),
  R('pates-potimarron', 'Pâtes complètes, sauce potimarron & noisettes', {
    tags: ['vegetarien'], main: 'cereales', time: 35, kcal: 520, keeps: 3, freezable: false,
    ing: [['pâtes complètes', 70, 'g', 'feculents'], ['potimarron', 200, 'g', 'legumes'], ['oignon', 0.3, '', 'legumes'],
      ['lait demi-écrémé', 50, 'ml', 'cremerie'], ['parmesan', 10, 'g', 'cremerie'], ['noisettes', 10, 'g', 'epicerie']],
    steps: ['Cuire le potimarron (avec la peau) et l\'oignon 20 min.', 'Mixer avec le lait et le parmesan.', 'Mélanger aux pâtes cuites, noisettes concassées au service.'],
  }),
  R('salade-epeautre', 'Salade de petit épeautre, légumes rôtis & houmous', {
    tags: ['vegan'], main: 'cereales', time: 45, kcal: 480, keeps: 4, freezable: false,
    ing: [['petit épeautre', 60, 'g', 'feculents'], ['courgette', 0.5, '', 'legumes'], ['poivron', 0.5, '', 'legumes'],
      ['oignon rouge', 0.3, '', 'legumes'], ['houmous', 40, 'g', 'epicerie'], HUILE],
    steps: ['Cuire le petit épeautre 35 min.', 'Rôtir les légumes 25 min à 200 °C.', 'Mélanger ; houmous au moment de servir.'],
  }),
];
